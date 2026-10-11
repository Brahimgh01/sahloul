// Settings: language, look, sounds, alerts, sync, security, data (spec section 8).
// Redesign: grouped cards (GroupHeading + Group), segmented pickers and ribbon rows.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { Entry } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import {
  AppText,
  Chip,
  Divider,
  Group,
  GroupHeading,
  Icon,
  IconButton,
  KV,
  Row,
  RowButton,
  Segmented,
  Spacer,
  Switch,
  type IconName,
} from '@/components/ui';
import { loadDemoData, resetDemoData } from '@/data/demo';
import { useT } from '@/i18n';
import { formatDate } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';
import { success } from '@/services/feedback';
import { testSound } from '@/services/notifications';
import { storageUsed } from '@/services/papers';
import { getLastSync, syncNow } from '@/services/sync';
import { toast } from '@/store/feedback';
import { useSettings, type AlertKind, type ThemeMode } from '@/store/settings';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';
import { gradients, type TextScaleName } from '@/theme/tokens';
import type { Language } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LANGS: Language[] = ['fr', 'ar', 'en'];
const LANG_LABELS: Record<Language, string> = { fr: 'Français', ar: 'العربية', en: 'English' };
const TEXT_SIZES: TextScaleName[] = ['normal', 'large', 'xlarge'];
const TEXT_SIZE_KEYS: Record<TextScaleName, string> = { normal: 'settings.textNormal', large: 'settings.textLarge', xlarge: 'settings.textXLarge' };
const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];
const THEME_KEYS: Record<ThemeMode, string> = { system: 'settings.themeSystem', light: 'settings.themeLight', dark: 'settings.themeDark' };
const ALERT_KINDS: AlertKind[] = ['device_late', 'critical_waiting', 'due_tomorrow', 'contract_ending', 'done', 'morning', 'sync_problem'];
const ALERT_LABELS: Record<AlertKind, string> = {
  device_late: 'today.late',
  critical_waiting: 'today.critical',
  due_tomorrow: 'today.sectionComingBack',
  contract_ending: 'companies.contractEndingSoon',
  done: 'common.done',
  morning: 'today.greetingMorning',
  sync_problem: 'sync.failed',
};
const ALERT_ICONS: Record<AlertKind, IconName> = {
  device_late: 'alert-circle-outline',
  critical_waiting: 'alarm-light-outline',
  due_tomorrow: 'calendar-clock',
  contract_ending: 'file-alert-outline',
  done: 'check-circle-outline',
  morning: 'weather-sunny',
  sync_problem: 'cloud-alert',
};
const AUTO_LOCK = [1, 5, 15, 0];

export function SettingsScreen() {
  const theme = useTheme();
  const { t } = useT();
  const nav = useNavigation<Nav>();
  const settings = useSettings();
  const set = useSettings((s) => s.set);
  const setAlert = useSettings((s) => s.setAlert);
  const waiting = useWork((s) => s.waiting);
  const refresh = useWork((s) => s.refresh);

  const [lastSync, setLastSync] = useState<string | null>(null);
  const [storage, setStorage] = useState('0 B');

  useEffect(() => {
    (async () => {
      setLastSync(await getLastSync());
      setStorage(await storageUsed());
    })();
  }, []);

  const onToggle = (key: keyof typeof settings, value: boolean) => set({ [key]: value } as never);

  const onLang = (l: Language) => {
    set({ language: l });
    toast(t('toast.lang', { name: LANG_LABELS[l] }));
  };

  const onThemeMode = (m: ThemeMode) => {
    set({ themeMode: m });
    toast(t('toast.theme'));
  };

  const doSync = async () => {
    const r = await syncNow();
    setLastSync(await getLastSync());
    if (r.skipped) toast(t('sync.offline'), { icon: 'cloud-outline' });
    else toast(t('toast.synced'), { tone: r.failed ? 'warn' : 'success', icon: 'cloud-check-outline' });
  };

  const onLoadDemo = async () => {
    await loadDemoData();
    await refresh();
    success();
    toast(t('demo.loaded'), { tone: 'success', icon: 'database-plus-outline' });
  };

  const resetDemo = () =>
    Alert.alert(t('settings.resetDemo'), t('settings.demoData'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          await resetDemoData();
          await loadDemoData();
          await refresh();
          success();
          toast(t('demo.reset'), { icon: 'delete-sweep-outline' });
        },
      },
    ]);

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }}>
        {/* Language */}
        <Entry>
          <GroupHeading>{t('settings.language')}</GroupHeading>
          <Segmented
            options={LANGS.map((l) => ({ value: l, label: LANG_LABELS[l] }))}
            value={settings.language}
            onChange={onLang}
          />
        </Entry>

        {/* Appearance */}
        <Entry delay={60}>
          <GroupHeading>{t('settings.appearance')}</GroupHeading>
          <Group>
            <BlockRow icon="theme-light-dark" title={t('settings.darkMode')}>
              <Segmented
                options={THEME_MODES.map((m) => ({ value: m, label: t(THEME_KEYS[m]) }))}
                value={settings.themeMode}
                onChange={onThemeMode}
              />
            </BlockRow>
            <Divider />
            <BlockRow icon="format-size" title={t('settings.textSize')}>
              <Segmented
                options={TEXT_SIZES.map((s) => ({ value: s, label: t(TEXT_SIZE_KEYS[s]) }))}
                value={settings.textScale}
                onChange={(s) => set({ textScale: s })}
              />
            </BlockRow>
            <Divider />
            <SetRow
              icon="motion-pause-outline"
              title={t('settings.reduceMotion')}
              right={<Switch value={settings.reduceMotion} onChange={(v) => onToggle('reduceMotion', v)} />}
            />
            <Divider />
            <SetRow
              icon="contrast-circle"
              title={t('settings.highContrast')}
              right={<Switch value={settings.highContrast} onChange={(v) => onToggle('highContrast', v)} />}
            />
          </Group>
        </Entry>

        {/* Sounds and voices */}
        <Entry delay={120}>
          <GroupHeading>{t('settings.soundsVoices')}</GroupHeading>
          <Group>
            <SetRow icon="volume-high" title={t('settings.sounds')} right={<Switch value={settings.soundsEnabled} onChange={(v) => onToggle('soundsEnabled', v)} />} />
            <Divider />
            <SetRow icon="vibrate" title={t('settings.haptics')} right={<Switch value={settings.hapticsEnabled} onChange={(v) => onToggle('hapticsEnabled', v)} />} />
            <Divider />
            <SetRow icon="microphone-outline" title={t('settings.assistantOn')} right={<Switch value={settings.assistantEnabled} onChange={(v) => onToggle('assistantEnabled', v)} />} />
            <Divider />
            <SetRow icon="cloud-upload-outline" title={t('settings.cloudOn')} right={<Switch value={settings.cloudSyncEnabled} onChange={(v) => onToggle('cloudSyncEnabled', v)} />} />
            <Divider />
            <SetRow icon="robot-outline" title={t('settings.aiOn')} right={<Switch value={settings.aiEnabled} onChange={(v) => onToggle('aiEnabled', v)} />} />
          </Group>
        </Entry>

        {/* Alerts */}
        <Entry delay={180}>
          <GroupHeading>{t('settings.alerts')}</GroupHeading>
          <Group>
            {ALERT_KINDS.map((k, i) => (
              <React.Fragment key={k}>
                {i > 0 ? <Divider /> : null}
                <Row style={{ gap: 10, paddingVertical: 8, minHeight: 56 }}>
                  <Icon name={ALERT_ICONS[k]} size={22} color={theme.colors.textMuted} />
                  <AppText size="body" numberOfLines={1} style={{ flex: 1 }}>
                    {t(ALERT_LABELS[k])}
                  </AppText>
                  <IconButton name="play-circle-outline" label={t('settings.testSound')} variant="soft" size={22} onPress={() => testSound(k)} />
                  <Switch value={settings.alerts[k].enabled} onChange={(v) => setAlert(k, { enabled: v })} />
                </Row>
              </React.Fragment>
            ))}
          </Group>
          <Spacer size="sm" />
          <AppText size="tiny" muted>
            {t('settings.dndHint')}
          </AppText>
        </Entry>

        {/* Data and sync */}
        <Entry delay={240}>
          <GroupHeading>{t('settings.sync')}</GroupHeading>
          <Group>
            <SetRow icon="wifi" title={t('settings.wifiOnly')} right={<Switch value={settings.wifiOnlyUploads} onChange={(v) => onToggle('wifiOnlyUploads', v)} />} />
            <Divider />
            <RowButton
              icon="cloud-sync-outline"
              iconColors={gradients.calm}
              title={t('settings.sync')}
              subtitle={`${t('settings.lastSync')}: ${lastSync ? formatDate(lastSync) : t('settings.never')}`}
              onPress={doSync}
            />
            <Divider />
            <RowButton icon="database-plus-outline" iconColors={gradients.gold} title={t('settings.loadDemo')} subtitle={t('settings.demoData')} onPress={onLoadDemo} />
            <Divider />
            <RowButton icon="tray-arrow-down" iconColors={gradients.brand} title={t('settings.importCsv')} subtitle={t('devices.import')} onPress={() => nav.navigate('ImportCsv')} />
            <Divider />
            <RowButton icon="delete-sweep-outline" iconColors={gradients.ember} title={t('settings.resetDemo')} subtitle={t('settings.demoData')} onPress={resetDemo} />
            <Divider />
            <RowButton icon="shield-check-outline" iconColors={gradients.fresh} title={t('settings.about')} subtitle={t('about.madeBy')} onPress={() => nav.navigate('About')} />
          </Group>

          <Group style={{ marginTop: theme.spacing.md }}>
            <KV label={t('settings.lastSync')} value={lastSync ? formatDate(lastSync) : t('settings.never')} />
            <KV label={t('settings.storageUsed')} value={storage} />
          </Group>
          <Spacer size="sm" />
          <AppText size="tiny" muted>
            {t('sync.pending', { count: waiting })}
          </AppText>
        </Entry>

        {/* Security */}
        <Entry delay={300}>
          <GroupHeading>{t('settings.security')}</GroupHeading>
          <Group>
            <SetRow icon="fingerprint" title={t('settings.pin')} right={<Switch value={settings.pinEnabled} onChange={(v) => onToggle('pinEnabled', v)} />} />
            <Divider />
            <View style={{ paddingVertical: 10 }}>
              <AppText size="body">{t('settings.autoLock')}</AppText>
              <Spacer size="sm" />
              <Row style={{ gap: 8, flexWrap: 'wrap' }}>
                {AUTO_LOCK.map((m) => (
                  <Chip
                    key={m}
                    label={m === 0 ? t('settings.never') : t('settings.minutes', { count: m })}
                    selected={settings.autoLockMinutes === m}
                    onPress={() => set({ autoLockMinutes: m })}
                  />
                ))}
              </Row>
            </View>
          </Group>
        </Entry>

        {/* Users and roles */}
        <Entry delay={360}>
          <GroupHeading>{t('settings.users')}</GroupHeading>
          <Group>
            <Row style={{ gap: 12, paddingVertical: 12, minHeight: 56 }}>
              <IconTile name="shield-account-outline" />
              <View style={{ flex: 1 }}>
                <AppText size="body" weight="600">
                  {t('auth.admin')}
                </AppText>
                <AppText size="small" muted>
                  {t('common.version')} 2
                </AppText>
              </View>
            </Row>
          </Group>
        </Entry>
      </ScrollView>
    </Screen>
  );
}

/** A small tinted square holding a row icon. */
function IconTile({ name }: { name: IconName }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: theme.colors.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={name} size={20} color={theme.colors.brand} />
    </View>
  );
}

/** One settings row: tinted icon + label + a trailing control. */
function SetRow({ icon, title, right }: { icon: IconName; title: string; right: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Row style={{ gap: 12, paddingVertical: 8, minHeight: theme.HIT + 8 }}>
      <IconTile name={icon} />
      <AppText size="body" numberOfLines={1} style={{ flex: 1 }}>
        {title}
      </AppText>
      {right}
    </Row>
  );
}

/** A settings block: title row on top, a full-width control underneath. */
function BlockRow({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingVertical: 10 }}>
      <Row style={{ gap: 12 }}>
        <IconTile name={icon} />
        <AppText size="body" style={{ flex: 1 }}>
          {title}
        </AppText>
      </Row>
      <Spacer size="sm" />
      {children}
    </View>
  );
}

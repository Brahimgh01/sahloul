// Settings: language, look, sounds, alerts, sync, security, data (spec section 8).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Chip, Divider, Icon, type IconName, Row, Spacer } from '@/components/ui';
import { loadDemoData, resetDemoData } from '@/data/demo';
import { useT } from '@/i18n';
import { formatDate } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';
import { success } from '@/services/feedback';
import { testSound } from '@/services/notifications';
import { storageUsed } from '@/services/papers';
import { getLastSync } from '@/services/sync';
import { useSettings, type AlertKind } from '@/store/settings';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';
import type { Language } from '@/types';
import type { TextScaleName } from '@/theme/tokens';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LANGS: Language[] = ['fr', 'ar', 'en'];
const LANG_LABELS: Record<Language, string> = { fr: 'Français', ar: 'العربية', en: 'English' };
const TEXT_SIZES: TextScaleName[] = ['normal', 'large', 'xlarge'];
const TEXT_SIZE_KEYS: Record<TextScaleName, string> = { normal: 'settings.textNormal', large: 'settings.textLarge', xlarge: 'settings.textXLarge' };
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
        },
      },
    ]);

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }}>
        {/* Language */}
        <Section title={t('settings.language')}>
          <View style={styles.chips}>
            {LANGS.map((l) => (
              <Chip key={l} label={LANG_LABELS[l]} selected={settings.language === l} onPress={() => set({ language: l })} />
            ))}
          </View>
        </Section>

        {/* Appearance */}
        <Section title={t('settings.appearance')}>
          <Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
            <AppText size="body">{t('settings.textSize')}</AppText>
          </Row>
          <View style={styles.chips}>
            {TEXT_SIZES.map((s) => (
              <Chip key={s} label={t(TEXT_SIZE_KEYS[s])} selected={settings.textScale === s} onPress={() => set({ textScale: s })} />
            ))}
          </View>
          <Spacer size="md" />
          <AppText size="body">{t('settings.darkMode')}</AppText>
          <Spacer size="sm" />
          <View style={styles.chips}>
            <Chip label={t('settings.themeSystem')} selected={settings.themeMode === 'system'} onPress={() => set({ themeMode: 'system' })} />
            <Chip label={t('settings.themeLight')} selected={settings.themeMode === 'light'} onPress={() => set({ themeMode: 'light' })} />
            <Chip label={t('settings.themeDark')} selected={settings.themeMode === 'dark'} onPress={() => set({ themeMode: 'dark' })} />
          </View>
          <Spacer size="md" />
          <SwitchRow icon="motion-pause-outline" label={t('settings.reduceMotion')} value={settings.reduceMotion} onChange={(v) => onToggle('reduceMotion', v)} />
          <SwitchRow icon="contrast-circle" label={t('settings.highContrast')} value={settings.highContrast} onChange={(v) => onToggle('highContrast', v)} />
        </Section>

        {/* Sounds and voices */}
        <Section title={t('settings.soundsVoices')}>
          <SwitchRow icon="volume-high" label={t('settings.sounds')} value={settings.soundsEnabled} onChange={(v) => onToggle('soundsEnabled', v)} />
          <SwitchRow icon="vibrate" label={t('settings.haptics')} value={settings.hapticsEnabled} onChange={(v) => onToggle('hapticsEnabled', v)} />
          <SwitchRow icon="microphone-outline" label={t('settings.assistantOn')} value={settings.assistantEnabled} onChange={(v) => onToggle('assistantEnabled', v)} />
          <SwitchRow icon="robot-outline" label={t('settings.aiOn')} value={settings.aiEnabled} onChange={(v) => onToggle('aiEnabled', v)} />
        </Section>

        {/* Alerts */}
        <Section title={t('settings.alerts')}>
          {ALERT_KINDS.map((k) => (
            <View key={k} style={[styles.alertRow, { borderTopColor: theme.colors.border }]}>
              <Icon name={ALERT_ICONS[k]} size={22} color={theme.colors.textMuted} />
              <AppText size="body" style={{ flex: 1 }}>
                {t(ALERT_LABELS[k])}
              </AppText>
              <Switch
                value={settings.alerts[k].enabled}
                onValueChange={(v) => setAlert(k, { enabled: v })}
                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                thumbColor={theme.colors.card}
              />
              <Button title={t('settings.testSound')} variant="ghost" onPress={() => testSound(k)} style={{ minWidth: 0 }} />
            </View>
          ))}
          <Spacer size="sm" />
          <AppText size="tiny" muted>
            {t('settings.dndHint')}
          </AppText>
        </Section>

        {/* Sync */}
        <Section title={t('settings.sync')}>
          <Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
            <AppText size="body">{t('settings.cloudOn')}</AppText>
            <Switch
              value={settings.cloudSyncEnabled}
              onValueChange={(v) => onToggle('cloudSyncEnabled', v)}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor={theme.colors.card}
            />
          </Row>
          <SwitchRow icon="wifi" label={t('settings.wifiOnly')} value={settings.wifiOnlyUploads} onChange={(v) => onToggle('wifiOnlyUploads', v)} />
          <Divider />
          <InfoRow label={t('settings.lastSync')} value={lastSync ? formatDate(lastSync) : t('settings.never')} />
          <Divider />
          <InfoRow label={t('settings.storageUsed')} value={storage} />
          <Spacer size="sm" />
          <AppText size="tiny" muted>
            {t('sync.pending', { count: waiting })}
          </AppText>
        </Section>

        {/* Security */}
        <Section title={t('settings.security')}>
          <SwitchRow icon="fingerprint" label={t('settings.pin')} value={settings.pinEnabled} onChange={(v) => onToggle('pinEnabled', v)} />
          <AppText size="body" style={{ marginTop: 4 }}>
            {t('settings.autoLock')}
          </AppText>
          <Spacer size="sm" />
          <View style={styles.chips}>
            {AUTO_LOCK.map((m) => (
              <Chip
                key={m}
                label={m === 0 ? t('settings.never') : t('settings.minutes', { count: m })}
                selected={settings.autoLockMinutes === m}
                onPress={() => set({ autoLockMinutes: m })}
              />
            ))}
          </View>
        </Section>

        {/* Users */}
        <Section title={t('settings.users')}>
          <Row style={{ gap: 10, paddingVertical: 8 }}>
            <Icon name="shield-account-outline" size={24} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <AppText size="body" weight="600">
                {t('auth.admin')}
              </AppText>
              <AppText size="small" muted>
                {t('common.version')} 2
              </AppText>
            </View>
          </Row>
        </Section>

        {/* Data */}
        <Section title={t('settings.demoData')}>
          <Button title={t('settings.importCsv')} icon="tray-arrow-down" variant="secondary" onPress={() => nav.navigate('ImportCsv')} />
          <Spacer size="sm" />
          <Button
            title={t('settings.loadDemo')}
            icon="database-plus-outline"
            variant="secondary"
            onPress={async () => {
              await loadDemoData();
              await refresh();
              success();
            }}
          />
          <Spacer size="sm" />
          <Button title={t('settings.resetDemo')} icon="delete-sweep-outline" variant="danger" onPress={resetDemo} />
        </Section>

        <Spacer size="md" />
        <Button title={t('settings.about')} icon="information-outline" variant="ghost" onPress={() => nav.navigate('About')} />
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <AppText size="section" weight="700" style={{ marginBottom: 8 }}>
        {title}
      </AppText>
      <Card>{children}</Card>
    </View>
  );
}

function SwitchRow({ icon, label, value, onChange }: { icon: IconName; label: string; value: boolean; onChange: (v: boolean) => void }) {
  const theme = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
      <Row style={{ gap: 10, flex: 1 }}>
        <Icon name={icon} size={22} color={theme.colors.textMuted} />
        <AppText size="body">{label}</AppText>
      </Row>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.colors.primary, false: theme.colors.border }} thumbColor={theme.colors.card} />
    </Row>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
      <AppText size="small" muted>
        {label}
      </AppText>
      <AppText size="body" weight="600">
        {value}
      </AppText>
    </Row>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
});

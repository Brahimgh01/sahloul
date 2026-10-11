// Today (home): a gradient hero with a live health ring, the streak, glass
// stats and the board shortcut; then the daily quests; then the three lists
// (spec 5.1). Everything animates in with a short stagger.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AppBar } from '@/components/AppBar';
import { DeviceCard } from '@/components/DeviceCard';
import { Gradient } from '@/components/Gradient';
import { Entry, PressScale, useCountUp } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { SyncBadge } from '@/components/SyncBadge';
import {
  AppText,
  Button,
  Display,
  EmptyState,
  GlassStat,
  HealthRing,
  Icon,
  IconButton,
  Quest,
  type QuestItem,
  Row,
  SectionTitle,
  Spacer,
} from '@/components/ui';
import type { DeviceWithTrip } from '@/data/queries';
import { useT } from '@/i18n';
import { greetingKey } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';
import { haptic, success } from '@/services/feedback';
import { openReminder } from '@/services/reminders';
import { syncNow } from '@/services/sync';
import { toast } from '@/store/feedback';
import { levelFor, todayKey, useGame } from '@/store/game';
import { useWork } from '@/store/work';
import { cardShadow, gradients } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const QUEST_XP = { qLate: 20, qReturn: 25, qScan: 15, qReview: 20 } as const;
const QUEST_IDS = ['qLate', 'qReturn', 'qScan', 'qReview'] as const;

export function TodayScreen() {
  const theme = useTheme();
  const { t, language } = useT();
  const nav = useNavigation<Nav>();
  const { today, companies, refresh, ready } = useWork();
  const [refreshing, setRefreshing] = useState(false);
  const [menuDevice, setMenuDevice] = useState<DeviceWithTrip | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const xp = useGame((s) => s.xp);
  const streak = useGame((s) => s.streak);
  const doneQuest = useGame((s) => s.done);
  const toggleQuest = useGame((s) => s.toggleQuest);
  const ensureDay = useGame((s) => s.ensureDay);

  useEffect(() => {
    ensureDay(todayKey());
  }, [ensureDay]);

  const greeting = useMemo(() => t(`today.${greetingKey()}`), [t, language]);
  const counts = today.counts;
  const clear = counts.away === 0 ? 1 : Math.max(0, (counts.away - counts.late) / counts.away);
  const lvl = levelFor(xp);

  const questItems: QuestItem[] = QUEST_IDS.map((id) => ({
    id,
    label: t(`game.${id}`),
    xp: QUEST_XP[id],
    done: !!doneQuest[id],
  }));

  const onToggleQuest = (id: string) => {
    haptic('light');
    const willDone = !doneQuest[id];
    toggleQuest(id, QUEST_XP[id as keyof typeof QUEST_XP] ?? 15);
    if (willDone) {
      success();
      const allDone = QUEST_IDS.every((q) => (q === id ? true : !!doneQuest[q]));
      if (allDone) {
        toast(t('game.achieved'), { tone: 'success', icon: 'trophy' });
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await syncNow();
    await refresh();
    setRefreshing(false);
    toast(t('toast.synced'), { tone: 'success', icon: 'cloud-check' });
  };

  const companyOf = (d: DeviceWithTrip) => companies.find((c) => c.id === d.trip_company_id) ?? null;
  const openDevice = (d: DeviceWithTrip) => nav.navigate('Device', { id: d.id });

  const goReturn = (d: DeviceWithTrip) => {
    haptic('light');
    nav.navigate('Return', { deviceId: d.id, tripId: d.trip_id ?? undefined });
  };

  const remind = async (d: DeviceWithTrip) => {
    const c = companyOf(d);
    if (!c) return;
    const ok = await openReminder(c, [{ inventory_no: d.inventory_no, type: d.type, days_late: d.days_late }], language);
    if (ok) {
      success();
      toast(t('toast.reminder', { company: c.name }), { tone: 'warn', icon: 'bell' });
    }
  };

  const Section = ({
    titleKey,
    color,
    data,
    emptyTitleKey,
    emptyBodyKey,
    pulse,
    delay = 0,
  }: {
    titleKey: string;
    color: string;
    data: DeviceWithTrip[];
    emptyTitleKey: string;
    emptyBodyKey: string;
    pulse?: boolean;
    delay?: number;
  }) => (
    <Entry delay={delay}>
      <SectionTitle title={t(titleKey)} color={color} count={data.length} />
      {data.length === 0 ? (
        <EmptyState icon="check-circle-outline" title={t(emptyTitleKey)} body={t(emptyBodyKey)} />
      ) : (
        data.map((d) => (
          <DeviceCard
            key={d.id}
            device={d}
            onPress={() => openDevice(d)}
            onLongPress={() => {
              haptic('light');
              setMenuDevice(d);
            }}
            onSwipeReturned={() => goReturn(d)}
            onSwipeRemind={() => remind(d)}
            criticalPulse={pulse}
          />
        ))
      )}
    </Entry>
  );

  return (
    <Screen edges={[]}>
      <AppBar
        greeting={greeting}
        title={t('common.appName')}
        scrolled={scrolled}
        right={
          <>
            <SyncBadge />
            <IconButton name="cog-outline" label={t('settings.title')} onPress={() => nav.navigate('Settings')} />
          </>
        }
      />
      <ScrollView
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 6)}
        scrollEventThrottle={32}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <Entry>
          <Gradient
            colors={gradients.brand}
            radius={theme.radius.xl}
            style={[styles.hero, cardShadow(theme.mode, 2)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Row style={{ gap: 14, alignItems: 'center' }}>
              <HealthRing
                size={104}
                pct={clear}
                center={
                  <Display size="title" weight="800" color="#FFFFFF">
                    {Math.round(clear * 100)}%
                  </Display>
                }
                centerSub={
                  <AppText size="tiny" weight="700" color="rgba(255,255,255,0.9)" style={{ textTransform: 'uppercase' }}>
                    {t('game.health')}
                  </AppText>
                }
              />
              <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
                <Display size="title" weight="800" color="#FFFFFF" numberOfLines={1}>
                  {t('today.allGood')}
                </Display>
                <View style={styles.streak}>
                  <Icon name="fire" size={16} color="#FFE08A" />
                  <AppText size="small" weight="700" color="#FFFFFF">
                    {t('game.streakDays', { n: streak })}
                  </AppText>
                </View>
                <AppText size="tiny" weight="600" color="rgba(255,255,255,0.9)">
                  {t('game.level', { n: lvl.level })} · {t('game.toNext', { n: lvl.need - lvl.into })}
                </AppText>
              </View>
            </Row>

            <Spacer size="lg" />
            <Row style={{ gap: 10 }}>
              <GlassStat value={counts.late} label={t('today.late')} />
              <GlassStat value={counts.away} label={t('today.away')} />
              <GlassStat value={counts.critical} label={t('today.critical')} />
            </Row>

            <Spacer size="lg" />
            <PressScale onPress={() => nav.navigate('Board')}>
              <View style={styles.heroAction}>
                <Icon name="view-column-outline" size={20} color="#fff" />
                <AppText size="body" weight="700" color="#fff">
                  {t('today.boardView')}
                </AppText>
              </View>
            </PressScale>
          </Gradient>
        </Entry>

        <Entry delay={70} style={{ marginTop: theme.spacing.xl }}>
          <Quest
            title={t('game.dailyQuests')}
            levelLabel={t('game.level', { n: lvl.level })}
            levelPct={lvl.pct}
            items={questItems}
            onToggle={onToggleQuest}
          />
        </Entry>

        <Section
          titleKey="today.sectionLate"
          color={theme.colors.late}
          data={today.late}
          emptyTitleKey="today.emptyLateTitle"
          emptyBodyKey="today.emptyLateBody"
          delay={120}
        />
        <Section
          titleKey="today.sectionCritical"
          color={theme.colors.critical}
          data={today.critical}
          emptyTitleKey="today.emptyCriticalTitle"
          emptyBodyKey="today.emptyCriticalBody"
          pulse
          delay={170}
        />
        <Section
          titleKey="today.sectionComingBack"
          color={theme.colors.info}
          data={today.comingBack}
          emptyTitleKey="today.emptyComingTitle"
          emptyBodyKey="today.emptyComingBody"
          delay={220}
        />

        {!ready ? (
          <AppText size="small" muted align="center" style={{ marginTop: theme.spacing.xl }}>
            {t('common.loading')}
          </AppText>
        ) : null}
      </ScrollView>

      {/* Long-press quick menu */}
      <Modal visible={!!menuDevice} transparent animationType="fade" onRequestClose={() => setMenuDevice(null)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => setMenuDevice(null)}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
            {menuDevice ? (
              <>
                <Display size="lg" weight="700">
                  {menuDevice.inventory_no}
                </Display>
                <AppText size="small" muted>
                  {menuDevice.type} · {menuDevice.department}
                </AppText>
                <Spacer size="lg" />
                <Button
                  title={t('today.quickCall')}
                  icon="phone"
                  variant="secondary"
                  block
                  onPress={() => {
                    const c = companyOf(menuDevice);
                    setMenuDevice(null);
                    if (c?.phone) Linking.openURL(`tel:${c.phone.replace(/\s/g, '')}`);
                  }}
                />
                <Spacer size="sm" />
                <Button
                  title={t('today.quickPapers')}
                  icon="file-document-outline"
                  variant="secondary"
                  block
                  onPress={() => {
                    const d = menuDevice;
                    setMenuDevice(null);
                    openDevice(d);
                  }}
                />
                <Spacer size="sm" />
                <Button title={t('common.close')} variant="ghost" block onPress={() => setMenuDevice(null)} />
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 18 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  heroAction: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
});

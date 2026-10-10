// Today (home): greeting, ring, sync icon, and the three lists (spec 5.1).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { DeviceCard } from '@/components/DeviceCard';
import { TodayRing } from '@/components/Ring';
import { Screen } from '@/components/Screen';
import { SyncBadge } from '@/components/SyncBadge';
import { AppText, Button, EmptyState, Icon, IconButton, Row, Spacer } from '@/components/ui';
import type { DeviceWithTrip } from '@/data/queries';
import { useDirection, useT } from '@/i18n';
import { greetingKey } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';
import { haptic, success } from '@/services/feedback';
import { openReminder } from '@/services/reminders';
import { syncNow } from '@/services/sync';
import { useSettings } from '@/store/settings';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TodayScreen() {
  const theme = useTheme();
  const { t, language } = useT();
  const dir = useDirection();
  const nav = useNavigation<Nav>();
  const { today, companies, refresh, ready } = useWork();
  const [refreshing, setRefreshing] = useState(false);
  const [menuDevice, setMenuDevice] = useState<DeviceWithTrip | null>(null);

  const greeting = useMemo(() => t(`today.${greetingKey()}`), [t, language]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncNow();
    await refresh();
    setRefreshing(false);
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
    if (ok) success();
  };

  const Section = ({
    titleKey,
    color,
    data,
    emptyTitleKey,
    emptyBodyKey,
    pulse,
  }: {
    titleKey: string;
    color: string;
    data: DeviceWithTrip[];
    emptyTitleKey: string;
    emptyBodyKey: string;
    pulse?: boolean;
  }) => (
    <View style={{ marginTop: theme.spacing.xxl }}>
      <Row style={{ gap: 8, marginBottom: theme.spacing.md }}>
        <View style={{ width: 6, height: 22, borderRadius: 3, backgroundColor: color }} />
        <AppText size="section" weight="700">
          {t(titleKey)}
        </AppText>
        <AppText size="small" weight="700" color={color}>
          {data.length}
        </AppText>
      </Row>
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
    </View>
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <AppText size="small" muted>
              {greeting}
            </AppText>
            <AppText size="title" weight="700">
              {t('common.appName')}
            </AppText>
          </View>
          <Row style={{ gap: 8 }}>
            <SyncBadge />
            <IconButton name="cog-outline" label={t('settings.title')} onPress={() => nav.navigate('Settings')} />
          </Row>
        </Row>

        <Spacer size="xl" />
        {ready ? (
          <TodayRing late={today.counts.late} away={today.counts.away} critical={today.counts.critical} />
        ) : null}

        <Section
          titleKey="today.sectionLate"
          color={theme.colors.late}
          data={today.late}
          emptyTitleKey="today.emptyLateTitle"
          emptyBodyKey="today.emptyLateBody"
        />
        <Section
          titleKey="today.sectionCritical"
          color={theme.colors.critical}
          data={today.critical}
          emptyTitleKey="today.emptyCriticalTitle"
          emptyBodyKey="today.emptyCriticalBody"
          pulse
        />
        <Section
          titleKey="today.sectionComingBack"
          color={theme.colors.info}
          data={today.comingBack}
          emptyTitleKey="today.emptyComingTitle"
          emptyBodyKey="today.emptyComingBody"
        />
      </ScrollView>

      {/* Long-press quick menu */}
      <Modal visible={!!menuDevice} transparent animationType="fade" onRequestClose={() => setMenuDevice(null)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => setMenuDevice(null)}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.card }]}>
            {menuDevice ? (
              <>
                <AppText size="section" weight="700">
                  {menuDevice.inventory_no}
                </AppText>
                <AppText size="small" muted>
                  {menuDevice.type} · {menuDevice.department}
                </AppText>
                <Spacer size="lg" />
                <Button
                  title={t('today.quickCall')}
                  icon="phone"
                  variant="secondary"
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
                  onPress={() => {
                    const d = menuDevice;
                    setMenuDevice(null);
                    openDevice(d);
                  }}
                />
                <Spacer size="sm" />
                <Button title={t('common.close')} variant="ghost" onPress={() => setMenuDevice(null)} />
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
});

// Mark a device as returned: result, cost, where it goes back (spec 5.3).
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Entry } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Chip, GroupHeading, Icon, Row, Spacer } from '@/components/ui';
import { getDeviceWithTrip, getDeviceTrips, type DeviceWithTrip } from '@/data/queries';
import { updateRow } from '@/db/repo';
import { useDirection, useT } from '@/i18n';
import { isoDate, formatDate } from '@/lib/dates';
import { parseTND } from '@/lib/money';
import type { RootStackParamList } from '@/navigation/types';
import { haptic, success } from '@/services/feedback';
import { cancelTripReminders } from '@/services/notifications';
import { printReceptionSheet } from '@/services/pdf';
import { celebrate, toast } from '@/store/feedback';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';
import type { DeviceStatus, Trip, TripResult } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Return'>;

const RESULTS: TripResult[] = ['repaired', 'not_repaired', 'replaced'];
const RESULT_KEYS: Record<TripResult, string> = {
  repaired: 'returnFlow.repaired',
  not_repaired: 'returnFlow.notRepaired',
  replaced: 'returnFlow.replaced',
};
const PLACES: DeviceStatus[] = ['back_in_service', 'ready_for_pickup', 'in_office'];

export function ReturnScreen() {
  const theme = useTheme();
  const { t } = useT();
  const dir = useDirection();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const refresh = useWork((s) => s.refresh);
  const companies = useWork((s) => s.companies);

  const [device, setDevice] = useState<DeviceWithTrip | null>(null);
  const [trips, setTrips] = useState<(Trip & { company_name: string })[]>([]);
  const [result, setResult] = useState<TripResult | null>(null);
  const [costText, setCostText] = useState('');
  const [place, setPlace] = useState<DeviceStatus>('back_in_service');
  const [busy, setBusy] = useState(false);
  const [askLoan, setAskLoan] = useState(false);

  useEffect(() => {
    (async () => {
      const [d, tr] = await Promise.all([getDeviceWithTrip(params.deviceId), getDeviceTrips(params.deviceId)]);
      setDevice(d);
      setTrips(tr);
    })();
  }, [params.deviceId]);

  const trip = useMemo(() => {
    if (params.tripId) return trips.find((x) => x.id === params.tripId) ?? null;
    return trips.find((x) => !x.returned_date) ?? null;
  }, [trips, params.tripId]);

  const company = useMemo(() => companies.find((c) => c.id === trip?.company_id) ?? null, [companies, trip]);

  if (!device) {
    return (
      <Screen edges={[]}>
        <View style={{ padding: theme.spacing.lg }}>
          <AppText muted>{t('common.loading')}</AppText>
        </View>
      </Screen>
    );
  }

  const doSave = async (print: boolean) => {
    if (result == null) return;
    setBusy(true);
    try {
      const returned = isoDate(new Date());
      const cost = parseTND(costText);
      if (trip) {
        await updateRow('trips', trip.id, { returned_date: returned, result, cost });
        await cancelTripReminders(trip.id);
      }
      await updateRow('devices', device.id, { status: place });
      await refresh();
      success();
      celebrate();
      toast(t('toast.returned'), { tone: 'success', icon: 'package-variant-closed-check' });
      if (print && trip) await printReceptionSheet(trip, device, company, 'fr');
      nav.goBack();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]} hideMic>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 180 }} keyboardShouldPersistTaps="handled">
        <Entry>
          <Card>
            <Row style={{ gap: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.colors.success + '22',
                }}
              >
                <Icon name="wrench" size={24} color={theme.colors.success} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText size="body" weight="700">
                  {device.type} · {device.brand}
                </AppText>
                <AppText size="small" muted>
                  {device.inventory_no}
                </AppText>
                {company ? (
                  <AppText size="small" muted numberOfLines={1}>
                    {company.name} · {t('device.sentOn', { date: formatDate(trip?.sent_date) })}
                  </AppText>
                ) : null}
              </View>
            </Row>
          </Card>
        </Entry>

        <GroupHeading>{t('returnFlow.result')}</GroupHeading>
        <View style={[styles.chips, { flexDirection: dir.row }]}>
          {RESULTS.map((r) => (
            <Chip
              key={r}
              label={t(RESULT_KEYS[r])}
              selected={result === r}
              tone={r === 'repaired' ? 'ok' : r === 'replaced' ? 'info' : 'crit'}
              icon={r === 'repaired' ? 'check-circle-outline' : r === 'replaced' ? 'swap-horizontal' : 'close-circle-outline'}
              onPress={() => {
                haptic('select');
                setResult(r);
              }}
            />
          ))}
        </View>

        <Spacer size="lg" />
        <AppText size="small" weight="700" muted style={{ marginBottom: 6 }}>
          {t('returnFlow.cost')}
        </AppText>
        <TextInput
          value={costText}
          onChangeText={setCostText}
          keyboardType="decimal-pad"
          placeholder="0.000"
          placeholderTextColor={theme.colors.textFaint}
          style={[
            styles.input,
            {
              color: theme.colors.text,
              borderColor: theme.colors.line,
              backgroundColor: theme.colors.surface,
              textAlign: dir.textAlign,
            },
          ]}
        />

        <Spacer size="lg" />
        <Button
          title={t('returnFlow.scanReception')}
          icon="line-scan"
          variant="outline"
          block
          onPress={() => nav.navigate('Scan', { deviceId: device.id, tripId: trip?.id, companyId: trip?.company_id })}
        />

        <GroupHeading>{t('returnFlow.wherePut')}</GroupHeading>
        <View style={[styles.chips, { flexDirection: dir.row }]}>
          {PLACES.map((p) => (
            <Chip
              key={p}
              label={t(`statuses.${p}`)}
              selected={place === p}
              icon={p === 'back_in_service' ? 'check-circle-outline' : p === 'ready_for_pickup' ? 'package-variant-closed' : 'office-building'}
              onPress={() => setPlace(p)}
            />
          ))}
        </View>

        <Spacer size="xl" />
        <Button
          title={t('common.save')}
          icon="check"
          variant="success"
          block
          loading={busy}
          disabled={result == null}
          onPress={() => {
            if (trip?.loan_id) setAskLoan(true);
            else doSave(false);
          }}
        />
        <Spacer size="sm" />
        <Button title={t('device.printReception')} variant="ghost" block disabled={result == null} onPress={() => doSave(true)} />
      </ScrollView>

      {/* Take the lent spare back (version 2) */}
      <Modal visible={askLoan} transparent animationType="fade" onRequestClose={() => setAskLoan(false)}>
        <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <Row style={{ gap: 8 }}>
              <Icon name="swap-horizontal" size={24} color={theme.colors.due} />
              <AppText size="section" weight="700">
                {t('returnFlow.takeLoanBack')}
              </AppText>
            </Row>
            <Spacer size="lg" />
            <Button
              title={t('common.yes')}
              block
              onPress={() => {
                setAskLoan(false);
                doSave(false);
              }}
            />
            <Spacer size="sm" />
            <Button
              title={t('common.notNow')}
              variant="ghost"
              block
              onPress={() => {
                setAskLoan(false);
                doSave(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexWrap: 'wrap', gap: 8 },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '600',
  },
  backdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 20, padding: 20 },
});

// Device page: top card, three tabs, and a bottom button that follows the status (spec 5.3).
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ResultChip, StatusChip, Tag } from '@/components/StatusChip';
import { AppText, Button, Card, Divider, EmptyState, Icon, IconButton, Row, Spacer } from '@/components/ui';
import { getDeviceTrips, getDeviceWithTrip, listPapers, type DeviceWithTrip, type PaperWithRefs } from '@/data/queries';
import { updateRow } from '@/db/repo';
import { daysBetween, formatDate } from '@/lib/dates';
import { formatTND } from '@/lib/money';
import { deviceIcon, PAPER_TYPE_META } from '@/lib/status';
import { useDirection, useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { haptic, success } from '@/services/feedback';
import { printDispatchNote, printReceptionSheet } from '@/services/pdf';
import { useSettings } from '@/store/settings';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaperType, Trip } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Device'>;

type Tab = 'history' | 'papers' | 'info';

export function DeviceScreen() {
  const theme = useTheme();
  const { t, language } = useT();
  const dir = useDirection();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const refresh = useWork((s) => s.refresh);
  const companies = useWork((s) => s.companies);

  const [device, setDevice] = useState<DeviceWithTrip | null>(null);
  const [trips, setTrips] = useState<(Trip & { company_name: string })[]>([]);
  const [papers, setPapers] = useState<PaperWithRefs[]>([]);
  const [tab, setTab] = useState<Tab>('history');
  const [editing, setEditing] = useState(false);

  const load = async () => {
    const [d, tr, pp] = await Promise.all([
      getDeviceWithTrip(params.id),
      getDeviceTrips(params.id),
      listPapers({ deviceId: params.id }),
    ]);
    setDevice(d);
    setTrips(tr);
    setPapers(pp);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const [form, setForm] = useState({ brand: '', model: '', notes: '' });
  useEffect(() => {
    if (device) setForm({ brand: device.brand ?? '', model: device.model ?? '', notes: device.notes ?? '' });
  }, [device]);

  const company = useMemo(() => companies.find((c) => c.id === device?.trip_company_id) ?? null, [companies, device]);

  const save = async () => {
    if (!device) return;
    await updateRow('devices', device.id, form);
    await refresh();
    await load();
    setEditing(false);
    success();
  };

  if (!device) {
    return (
      <Screen edges={[]}>
        <View style={{ padding: theme.spacing.lg }}>
          <AppText muted>{t('common.loading')}</AppText>
        </View>
      </Screen>
    );
  }

  const isAway = device.status === 'at_company';

  const TabButton = ({ value, label }: { value: Tab; label: string }) => {
    const on = tab === value;
    return (
      <View
        accessibilityRole="button"
        onTouchEnd={() => {
          haptic('select');
          setTab(value);
        }}
        style={[styles.tabBtn, { borderBottomColor: on ? theme.colors.primary : 'transparent' }]}
      >
        <AppText size="body" weight={on ? '700' : '500'} color={on ? theme.colors.primary : theme.colors.textMuted}>
          {label}
        </AppText>
      </View>
    );
  };

  return (
    <Screen edges={[]} hideMic={false}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 200 }}>
        {/* Top card */}
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row style={{ gap: 10, flex: 1 }}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.primarySoft }]}>
                <Icon name={deviceIcon(device.type)} size={28} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText size="section" weight="700">
                  {device.type} · {device.brand}
                </AppText>
                <AppText size="small" muted>
                  {t('device.inventoryNo')}: {device.inventory_no}
                </AppText>
                <AppText size="small" muted>
                  {t('device.serialNo')}: {device.serial_no || '—'}
                </AppText>
              </View>
            </Row>
          </Row>
          <Spacer size="md" />
          <Row style={{ gap: 8, flexWrap: 'wrap' }}>
            <Tag label={device.department} icon="hospital-building" color={device.critical_department ? theme.colors.critical : theme.colors.textMuted} />
            {device.critical_department ? <Tag label={t('device.criticalBadge')} icon="alert" color={theme.colors.critical} /> : null}
            <StatusChip status={device.status} />
          </Row>
          {isAway && company ? (
            <>
              <Spacer size="md" />
              <AppText size="small" color={device.is_late ? theme.colors.late : theme.colors.textMuted}>
                {t('device.currentlyAt', { company: company.name })}
                {device.expected_return_date ? ` · ${t('device.expectedOn', { date: formatDate(device.expected_return_date) })}` : ''}
              </AppText>
            </>
          ) : null}
        </Card>

        {/* Tabs */}
        <Row style={{ marginTop: theme.spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }}>
          <TabButton value="history" label={t('device.history')} />
          <TabButton value="papers" label={t('device.papers')} />
          <TabButton value="info" label={t('device.info')} />
        </Row>

        {tab === 'history' ? (
          <View style={{ marginTop: theme.spacing.lg }}>
            {trips.length === 0 ? (
              <EmptyState icon="history" title={t('device.history')} body={t('device.noHistory')} />
            ) : (
              trips.map((tr) => (
                <Card key={tr.id} style={{ marginBottom: theme.spacing.md }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <AppText size="body" weight="600">
                      {tr.company_name}
                    </AppText>
                    {tr.result ? <ResultChip result={tr.result} /> : null}
                  </Row>
                  <Spacer size="sm" />
                  <AppText size="small" muted>
                    {t('device.sentOn', { date: formatDate(tr.sent_date) })}
                  </AppText>
                  <AppText size="small" muted>
                    {tr.returned_date ? t('device.returnedOn', { date: formatDate(tr.returned_date) }) : t('device.expectedOn', { date: formatDate(tr.expected_return_date) })}
                  </AppText>
                  {tr.problem ? (
                    <>
                      <Spacer size="sm" />
                      <AppText size="small">{tr.problem}</AppText>
                    </>
                  ) : null}
                  {tr.cost != null ? (
                    <>
                      <Spacer size="sm" />
                      <AppText size="small" weight="600">
                        {t('device.cost')}: {formatTND(tr.cost)}
                      </AppText>
                    </>
                  ) : null}
                </Card>
              ))
            )}
          </View>
        ) : null}

        {tab === 'papers' ? (
          <View style={{ marginTop: theme.spacing.lg }}>
            {papers.length === 0 ? (
              <EmptyState icon="file-document-outline" title={t('device.papers')} body={t('device.noPapers')} actionLabel={t('scan.cta')} onAction={() => nav.navigate('Scan')} />
            ) : (
              papers.map((p) => (
                <Card key={p.id} style={{ marginBottom: theme.spacing.md }}>
                  <Row style={{ gap: 10 }}>
                    <Icon name={PAPER_TYPE_META[p.type as PaperType].icon} size={24} color={theme.colors.primary} />
                    <View style={{ flex: 1 }}>
                      <AppText size="body" weight="600">
                        {t(PAPER_TYPE_META[p.type as PaperType].i18nKey)}
                      </AppText>
                      <AppText size="small" muted>
                        {p.file_name}
                      </AppText>
                    </View>
                    <IconButton name="chevron-right" label={t('common.open')} onPress={() => nav.navigate('PaperViewer', { paperId: p.id })} />
                  </Row>
                </Card>
              ))
            )}
          </View>
        ) : null}

        {tab === 'info' ? (
          <View style={{ marginTop: theme.spacing.lg }}>
            <Card>
              <InfoRow label={t('device.brand')} value={device.brand} />
              <Divider />
              <InfoRow label={t('device.model')} value={device.model} />
              <Divider />
              <InfoRow label={t('device.purchaseDate')} value={formatDate(device.purchase_date)} />
              <Divider />
              <InfoRow label={t('device.purchaseCost')} value={formatTND(device.purchase_cost)} />
              <Divider />
              <InfoRow label={t('device.department')} value={device.department} />
              <Divider />
              <InfoRow label={t('device.notes')} value={device.notes || '—'} />
            </Card>

            {/* Keep or replace (version 2) - shows reasons, she decides. */}
            <Spacer size="lg" />
            <KeepOrReplace trips={trips} device={device} />
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom action button that follows the status */}
      <View style={[styles.bottom, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        {isAway ? (
          <Button title={t('device.markReturned')} icon="package-variant-closed-check" onPress={() => nav.navigate('Return', { deviceId: device.id, tripId: device.trip_id ?? undefined })} />
        ) : (
          <Button title={t('device.sendToCompany')} icon="truck-fast-outline" onPress={() => nav.navigate('Send', { deviceIds: [device.id] })} />
        )}
      </View>

      {/* Header menu */}
      <Row style={{ position: 'absolute', top: 0, right: 0, left: 0, justifyContent: 'flex-end', padding: theme.spacing.md }}>
        <IconButton name="pencil-outline" label={t('device.edit')} onPress={() => setEditing(true)} />
        <IconButton
          name="printer-outline"
          label={t('device.printDispatch')}
          onPress={() => printDispatchNote([device], company, language)}
        />
      </Row>

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <AppText size="section" weight="700">
              {t('device.edit')}
            </AppText>
            <Spacer size="md" />
            <Field label={t('device.brand')} value={form.brand} onChange={(v) => setForm((f) => ({ ...f, brand: v }))} />
            <Field label={t('device.model')} value={form.model} onChange={(v) => setForm((f) => ({ ...f, model: v }))} />
            <Field label={t('device.notes')} value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} multiline hint={t('common.noPatientNames')} />
            <Spacer size="lg" />
            <Button title={t('common.save')} onPress={save} />
            <Spacer size="sm" />
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setEditing(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const dir = useDirection();
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 10, flexDirection: dir.row }}>
      <AppText size="small" muted>
        {label}
      </AppText>
      <AppText size="body" weight="600" style={{ flexShrink: 1, textAlign: dir.textAlign }}>
        {value}
      </AppText>
    </Row>
  );
}

function Field({ label, value, onChange, multiline, hint }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; hint?: string }) {
  const theme = useTheme();
  const dir = useDirection();
  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      <AppText size="small" muted>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholderTextColor={theme.colors.textFaint}
        style={{
          minHeight: 48,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          color: theme.colors.text,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 16,
          textAlign: dir.textAlign,
          marginTop: 6,
        }}
      />
      {hint ? (
        <AppText size="tiny" muted style={{ marginTop: 4 }}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

// Version 2 "Keep or replace" card: the app advises, she decides.
function KeepOrReplace({ trips, device }: { trips: (Trip & { company_name: string })[]; device: DeviceWithTrip }) {
  const theme = useTheme();
  const { t } = useT();
  const repairs = trips.filter((x) => x.result === 'repaired' || x.result === 'replaced').length;
  const repairCost = trips.reduce((a, x) => a + (x.cost ?? 0), 0);
  const age = device.purchase_date ? Math.floor(daysBetween(device.purchase_date, new Date()) / 365) : 0;
  const half = (device.purchase_cost ?? 0) / 2;

  const reasons: string[] = [];
  if (repairs >= 3) reasons.push(t('device.ruleRepairs', { count: repairs }));
  if (age > 5) reasons.push(t('device.ruleAge', { years: 5 }));
  if (device.purchase_cost && repairCost > half) reasons.push(t('device.ruleCost'));

  return (
    <Card>
      <Row style={{ gap: 8 }}>
        <Icon name="lightbulb-on-outline" size={22} color={theme.colors.due} />
        <AppText size="section" weight="700">
          {t('device.keepOrReplace')}
        </AppText>
      </Row>
      <Spacer size="sm" />
      <AppText size="small" muted>
        {reasons.length > 0 ? t('device.adviceReplace') : t('device.adviceKeep')}
      </AppText>
      <Spacer size="md" />
      {reasons.map((r) => (
        <Row key={r} style={{ gap: 8, paddingVertical: 3 }}>
          <Icon name="circle-medium" size={16} color={theme.colors.due} />
          <AppText size="small">{r}</AppText>
        </Row>
      ))}
      <Spacer size="sm" />
      <AppText size="tiny" muted>
        {t('device.youDecide')}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 20, padding: 20 },
});

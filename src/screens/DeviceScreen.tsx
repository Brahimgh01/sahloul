// Device page: gradient hero, three tabs, and a bottom action bar that follows
// the status (spec 5.3). Visual layer only - the data + actions are unchanged.
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { Gradient } from '@/components/Gradient';
import { Entry, PressScale } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { ResultChip, StatusChip } from '@/components/StatusChip';
import {
  AppText,
  Button,
  Card,
  Display,
  EmptyState,
  Group,
  Icon,
  IconButton,
  type IconName,
  KV,
  Row,
  Segmented,
  Spacer,
  Tag,
} from '@/components/ui';
import { getDeviceTrips, getDeviceWithTrip, listPapers, type DeviceWithTrip, type PaperWithRefs } from '@/data/queries';
import { updateRow } from '@/db/repo';
import { daysBetween, daysLate, daysLeft, formatDate } from '@/lib/dates';
import { formatTND } from '@/lib/money';
import { PAPER_TYPE_META } from '@/lib/status';
import { useDirection, useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { haptic, success } from '@/services/feedback';
import { printDispatchNote } from '@/services/pdf';
import { toast } from '@/store/feedback';
import { useWork } from '@/store/work';
import { cardShadow, gradients } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaperType, Trip } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Device'>;

type Tab = 'history' | 'papers' | 'info';

export function DeviceScreen() {
  const theme = useTheme();
  const { t, language } = useT();
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

  const tabs: { value: Tab; label: string }[] = [
    { value: 'info', label: t('device.info') },
    { value: 'history', label: t('device.history') },
    { value: 'papers', label: t('device.papers') },
  ];

  const printIt = () => {
    printDispatchNote([device], company, language);
    toast(t('toast.printed'), { tone: 'success', icon: 'printer' });
  };

  const shareIt = async () => {
    try {
      await Share.share({
        message: `${device.inventory_no} — ${device.type} · ${device.brand} (${device.department})`,
      });
    } catch {
      /* user cancelled */
    }
    toast(t('toast.shared'), { tone: 'success', icon: 'share-variant' });
  };

  const hasPills = device.critical_department || device.is_late || (isAway && !!company);

  return (
    <Screen edges={[]} hideMic={false}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 220 }}>
        {/* Gradient hero */}
        <Entry>
          <Gradient
            colors={gradients.brand}
            radius={theme.radius.xl}
            style={[styles.hero, cardShadow(theme.mode, 2)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Row style={{ alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText size="small" weight="700" color="rgba(255,255,255,0.9)">
                  {device.inventory_no}
                </AppText>
                <Display size="title" weight="800" color="#FFFFFF" numberOfLines={1}>
                  {device.type} · {device.brand}
                </Display>
                <AppText size="small" color="rgba(255,255,255,0.92)" numberOfLines={1}>
                  {device.department}
                </AppText>
              </View>
              <IconButton
                name="pencil-outline"
                label={t('device.edit')}
                color="#FFFFFF"
                background="rgba(255,255,255,0.2)"
                onPress={() => setEditing(true)}
              />
              <View style={styles.heroBadge}>
                <Icon name="wrench" size={26} color="#FFFFFF" />
              </View>
            </Row>

            {hasPills ? (
              <Row style={{ gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {device.critical_department ? <HeroPill icon="alert" label={t('device.criticalBadge')} /> : null}
                {device.is_late ? (
                  <HeroPill icon="clock-alert-outline" label={t('today.daysLate', { count: device.days_late })} />
                ) : null}
                {isAway && company ? (
                  <HeroPill icon="factory" label={t('device.currentlyAt', { company: company.name })} />
                ) : null}
              </Row>
            ) : null}
          </Gradient>
        </Entry>

        {/* Tabs */}
        <Entry delay={70}>
          <Spacer size="lg" />
          <Segmented
            options={tabs}
            value={tab}
            onChange={(v) => {
              haptic('select');
              setTab(v);
            }}
          />
        </Entry>

        <Entry key={tab} delay={110} style={{ marginTop: theme.spacing.lg }}>
          {tab === 'info' ? (
            <View>
              <Group>
                <KV label={t('device.brand')} value={device.brand} />
                <KV label={t('device.model')} value={device.model} />
                <KV label={t('device.department')} value={device.department} />
                <KV label={t('device.serialNo')} value={device.serial_no || '—'} />
                <KV label={t('device.purchaseDate')} value={formatDate(device.purchase_date)} />
                <KV label={t('device.purchaseCost')} value={formatTND(device.purchase_cost)} />
                <KV label={t('device.status')}>
                  <StatusChip status={device.status} />
                </KV>
                {device.notes ? <KV label={t('device.notes')} value={device.notes} /> : null}
              </Group>

              {/* Keep or replace (version 2) - shows reasons, she decides. */}
              <KeepOrReplace trips={trips} device={device} />
            </View>
          ) : null}

          {tab === 'history' ? <HistoryTab trips={trips} /> : null}

          {tab === 'papers' ? (
            <PapersTab papers={papers} onOpen={(id) => nav.navigate('PaperViewer', { paperId: id })} onScan={() => nav.navigate('Scan')} />
          ) : null}
        </Entry>
      </ScrollView>

      {/* Bottom action bar that follows the status */}
      <View style={[styles.bottom, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.line }]}>
        <Row style={{ gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              title={t('device.sendToCompany')}
              icon="truck-fast-outline"
              onPress={() => nav.navigate('Send', { deviceIds: [device.id] })}
              block
            />
          </View>
          {isAway ? (
            <PressScale
              accessibilityRole="button"
              accessibilityLabel={t('device.markReturned')}
              scaleTo={0.94}
              onPress={() => {
                haptic('light');
                nav.navigate('Return', { deviceId: device.id, tripId: device.trip_id ?? undefined });
              }}
            >
              <View style={[styles.returnBtn, { backgroundColor: theme.colors.success, borderRadius: theme.radius.md }]}>
                <Icon name="package-variant-closed-check" size={24} color="#FFFFFF" />
              </View>
            </PressScale>
          ) : null}
        </Row>
        <Spacer size="sm" />
        <Row style={{ gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title={t('device.printDispatch')} icon="printer-outline" variant="outline" onPress={printIt} block />
          </View>
          <View style={{ flex: 1 }}>
            <Button title={t('device.share')} icon="share-variant-outline" variant="outline" onPress={shareIt} block />
          </View>
        </Row>
      </View>

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
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

function HeroPill({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.heroPill}>
      <Icon name={icon} size={15} color="#FFFFFF" />
      <AppText size="tiny" weight="700" color="#FFFFFF" numberOfLines={1}>
        {label}
      </AppText>
    </View>
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
          borderColor: theme.colors.line,
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

type TimelineEvent = { key: string; tone: 'done' | 'late' | 'brand'; title: string; subtitle?: string; tag?: React.ReactNode };

// History as a vertical timeline (sent / expected / returned).
function HistoryTab({ trips }: { trips: (Trip & { company_name: string })[] }) {
  const theme = useTheme();
  const { t } = useT();

  if (trips.length === 0) {
    return <EmptyState icon="history" title={t('device.history')} body={t('device.noHistory')} />;
  }

  const events: TimelineEvent[] = [];
  trips.forEach((tr) => {
    const late = !tr.returned_date && daysLeft(tr.expected_return_date) < 0;
    events.push({
      key: `${tr.id}-sent`,
      tone: 'done',
      title: t('device.sentOn', { date: formatDate(tr.sent_date) }),
      subtitle: tr.company_name,
      tag: tr.cost != null ? <Tag label={formatTND(tr.cost)} tone="info" icon="cash" /> : undefined,
    });
    if (tr.returned_date) {
      events.push({
        key: `${tr.id}-returned`,
        tone: 'done',
        title: t('device.returnedOn', { date: formatDate(tr.returned_date) }),
        tag: tr.result ? <ResultChip result={tr.result} /> : undefined,
      });
    } else {
      events.push({
        key: `${tr.id}-expected`,
        tone: late ? 'late' : 'brand',
        title: t('device.expectedOn', { date: formatDate(tr.expected_return_date) }),
        subtitle: tr.problem || undefined,
        tag: late ? <Tag label={t('today.daysLate', { count: daysLate(tr.expected_return_date) })} tone="late" icon="alert" /> : undefined,
      });
    }
  });

  return (
    <Group style={{ paddingVertical: 14 }}>
      {events.map((e, i) => (
        <TimelineItem key={e.key} title={e.title} subtitle={e.subtitle} tone={e.tone} tag={e.tag} last={i === events.length - 1} />
      ))}
    </Group>
  );
}

function TimelineItem({
  title,
  subtitle,
  tone,
  tag,
  last,
}: {
  title: string;
  subtitle?: string;
  tone: 'done' | 'late' | 'brand';
  tag?: React.ReactNode;
  last?: boolean;
}) {
  const theme = useTheme();
  const color = tone === 'late' ? theme.colors.late : tone === 'done' ? theme.colors.success : theme.colors.brand;
  return (
    <Row style={{ alignItems: 'stretch', gap: 12 }}>
      <View style={{ width: 22, alignSelf: 'stretch', alignItems: 'center' }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: 4, backgroundColor: color, borderWidth: 2, borderColor: theme.colors.surface }} />
        {!last ? <View style={{ width: 2, flex: 1, minHeight: 24, marginTop: 2, backgroundColor: theme.colors.line }} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 16 }}>
        <AppText size="body" weight="700">
          {title}
        </AppText>
        {subtitle ? (
          <AppText size="small" muted numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
        {tag ? <View style={{ marginTop: 6, alignItems: 'flex-start' }}>{tag}</View> : null}
      </View>
    </Row>
  );
}

// Documents tab: the papers filed for this device.
function PapersTab({ papers, onOpen, onScan }: { papers: PaperWithRefs[]; onOpen: (id: string) => void; onScan: () => void }) {
  const theme = useTheme();
  const { t } = useT();

  if (papers.length === 0) {
    return <EmptyState icon="file-document-outline" title={t('device.papers')} body={t('device.noPapers')} actionLabel={t('scan.cta')} onAction={onScan} />;
  }

  return (
    <>
      {papers.map((p) => {
        const meta = PAPER_TYPE_META[p.type as PaperType] ?? PAPER_TYPE_META.other;
        return (
          <PressScale key={p.id} onPress={() => onOpen(p.id)} style={{ marginBottom: theme.spacing.md }} accessibilityRole="button" accessibilityLabel={p.file_name}>
            <Card>
              <Row style={{ gap: 12 }}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.brandSoft }]}>
                  <Icon name={meta.icon} size={22} color={theme.colors.brand} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText size="body" weight="700" numberOfLines={1}>
                    {t(meta.i18nKey)}
                  </AppText>
                  <AppText size="small" muted numberOfLines={1}>
                    {p.file_name}
                  </AppText>
                </View>
                <Icon name="chevron-right" size={22} color={theme.colors.textFaint} />
              </Row>
            </Card>
          </PressScale>
        );
      })}
    </>
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

  const replace = reasons.length > 0;
  const wear = Math.min(100, Math.max(10, age * 8 + ((device.purchase_cost ?? 0) > 3000 ? 20 : 0)));

  return (
    <Group style={{ marginTop: theme.spacing.lg, paddingVertical: 4 }}>
      <Row style={{ gap: 12, paddingVertical: 14 }}>
        <View style={[styles.adviceIcon, { backgroundColor: theme.colors.brandSoft }]}>
          <Icon name="chart-line-variant" size={20} color={theme.colors.brand} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Display size="lg" weight="700">
            {t('device.keepOrReplace')}
          </Display>
          <AppText size="small" muted>
            {replace ? t('device.adviceReplace') : t('device.adviceKeep')}
          </AppText>
        </View>
      </Row>

      {/* Health meter: success -> warn -> danger with a draggable-looking knob. */}
      <View style={{ paddingBottom: 12 }}>
        <View style={{ height: 20, justifyContent: 'center' }}>
          <View style={{ height: 12, borderRadius: 6, overflow: 'hidden' }}>
            <Gradient colors={[theme.colors.success, theme.colors.warn, theme.colors.danger]} radius={6} style={StyleSheet.absoluteFill} />
          </View>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: `${wear}%`,
              marginLeft: -10,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: theme.colors.surface,
              borderWidth: 3,
              borderColor: theme.colors.brand,
            }}
          />
        </View>
        <Row style={{ justifyContent: 'space-between', marginTop: 8, gap: 12 }}>
          <AppText size="tiny" weight="700" color={replace ? theme.colors.textFaint : theme.colors.success} style={{ flex: 1 }} numberOfLines={2}>
            {t('device.adviceKeep')}
          </AppText>
          <AppText size="tiny" weight="700" align="right" color={replace ? theme.colors.danger : theme.colors.textFaint} style={{ flex: 1 }} numberOfLines={2}>
            {t('device.adviceReplace')}
          </AppText>
        </Row>
      </View>

      {reasons.length > 0 ? (
        <Row style={{ gap: 8, flexWrap: 'wrap', paddingBottom: 10 }}>
          {reasons.map((r) => (
            <Tag key={r} label={r} tone="warn" icon="alert-circle-outline" />
          ))}
        </Row>
      ) : null}

      <AppText size="tiny" muted style={{ paddingBottom: 12 }}>
        {t('device.youDecide')}
      </AppText>
    </Group>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 18 },
  heroBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  adviceIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  returnBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 20, padding: 20 },
});

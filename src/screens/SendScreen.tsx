// Send a device to a company: 3 short steps, 3 taps for the common case (spec 5.3).
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Gradient } from '@/components/Gradient';
import { Entry, PressScale } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import {
  AppText,
  Button,
  Display,
  Group,
  GroupHeading,
  Icon,
  KV,
  ProgressDots,
  Row,
  SearchBar,
  Spacer,
  Tag,
} from '@/components/ui';
import type { CompanyWithStats, DeviceWithTrip } from '@/data/queries';
import { insertRow, updateRow } from '@/db/repo';
import { useDirection, useT } from '@/i18n';
import { addBusinessDays, addDays, isoDate, formatDate } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';
import { haptic, success } from '@/services/feedback';
import { scheduleTripReminders } from '@/services/notifications';
import { printDispatchNote } from '@/services/pdf';
import { toast } from '@/store/feedback';
import { useSettings } from '@/store/settings';
import { useWork } from '@/store/work';
import { cardShadow, gradients } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Send'>;

export function SendScreen() {
  const theme = useTheme();
  const { t, language } = useT();
  const dir = useDirection();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const devices = useWork((s) => s.devices);
  const companies = useWork((s) => s.companies);
  const refresh = useWork((s) => s.refresh);
  const weekendDays = useSettings((s) => s.weekendDays);

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>(params?.deviceIds ?? []);
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(params?.companyId ?? null);
  const [problem, setProblem] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [extraDays, setExtraDays] = useState(0);
  const [busy, setBusy] = useState(false);
  const [askLend, setAskLend] = useState(false);

  const selectable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices
      .filter((d) => d.status !== 'at_company' && d.status !== 'retired')
      .filter((d) => !q || `${d.inventory_no} ${d.type} ${d.brand} ${d.department}`.toLowerCase().includes(q));
  }, [devices, search]);

  const chosen = useMemo(() => devices.filter((d) => selected.includes(d.id)), [devices, selected]);
  const company = useMemo(() => companies.find((c) => c.id === companyId) ?? null, [companies, companyId]);

  const deadlineDays = company?.contract?.deadline_days ?? 7;
  const suggested = useMemo(() => {
    const base = addBusinessDays(new Date(), deadlineDays, weekendDays);
    return isoDate(addDays(base, extraDays));
  }, [deadlineDays, weekendDays, extraDays]);

  const anyCritical = chosen.some((d) => d.critical_department);

  const toggle = (id: string) => {
    haptic('select');
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const isCovered = (c: CompanyWithStats) => {
    const types = c.contract?.covered_device_types ?? [];
    return chosen.length > 0 && chosen.every((d) => types.includes(d.type));
  };

  const addPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!res.canceled && res.assets?.[0]) setPhoto(res.assets[0].uri);
  };

  const save = async (print: boolean) => {
    if (chosen.length === 0 || !company) return;
    setBusy(true);
    try {
      const sent = isoDate(new Date());
      for (const d of chosen) {
        const trip = await insertRow('trips', {
          device_id: d.id,
          company_id: company.id,
          problem,
          sent_date: sent,
          expected_return_date: expected(),
          returned_date: null,
          cost: null,
          result: null,
          photo_path: photo,
          loan_id: null,
        });
        await updateRow('devices', d.id, { status: 'at_company' });
        await scheduleTripReminders({
          tripId: trip.id,
          deviceLabel: `${d.type} ${d.inventory_no}`,
          companyName: company.name,
          expectedReturn: expected(),
          critical: d.critical_department,
          language,
        });
      }
      await refresh();
      success();
      toast(t('toast.sent', { company: company.name }), { tone: 'success', icon: 'truck-check-outline' });
      if (print) await printDispatchNote(chosen, company, language);
      nav.goBack();
    } finally {
      setBusy(false);
    }
  };

  const expected = () => suggested;

  const trySave = (print: boolean) => {
    if (anyCritical) {
      setAskLend(true);
      return;
    }
    save(print);
  };

  const goNext = () => {
    if (step === 0 && chosen.length === 0) return;
    if (step === 1 && !company) return;
    haptic('select');
    setStep((s) => Math.min(2, s + 1));
  };

  const goBack = () => (step === 0 ? nav.goBack() : setStep((s) => Math.max(0, s - 1)));

  return (
    <Screen edges={[]} hideMic>
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <ProgressDots count={3} index={step} />
          <AppText size="tiny" weight="700" muted>
            {t('common.step')} {step + 1} {t('common.of')} 3
          </AppText>
        </Row>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }} keyboardShouldPersistTaps="handled">
        <Entry key={step}>
          {step === 0 ? (
            <>
              <Display size="lg" weight="700">
                {t('send.pickDevices')}
              </Display>
              <Spacer size="md" />
              <SearchBar value={search} onChangeText={setSearch} placeholder={t('devices.searchPlaceholder')} />
              <Spacer size="md" />
              {selectable.map((d) => (
                <DeviceMiniCard key={d.id} device={d} selected={selected.includes(d.id)} onPress={() => toggle(d.id)} />
              ))}
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Display size="lg" weight="700">
                {t('send.pickCompany')}
              </Display>
              <Spacer size="md" />
              {companies.map((c) => (
                <CompanyMiniCard
                  key={c.id}
                  company={c}
                  selected={companyId === c.id}
                  covered={isCovered(c)}
                  onPress={() => {
                    haptic('select');
                    setCompanyId(c.id);
                    setExtraDays(0);
                  }}
                />
              ))}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <GroupHeading>{t('send.step3')}</GroupHeading>
              <Group>
                {chosen.map((d) => (
                  <KV key={d.id} label={`${d.type} · ${d.brand}`} value={d.inventory_no} />
                ))}
                {company ? <KV label={t('doc.company')} value={company.name} /> : null}
                <KV label={t('send.expectedReturn')} value={formatDate(suggested)} />
              </Group>

              <Spacer size="lg" />
              <AppText size="small" weight="700" muted style={{ marginBottom: 6 }}>
                {t('send.problemLabel')} ({t('common.optional')})
              </AppText>
              <TextInput
                value={problem}
                onChangeText={setProblem}
                multiline
                placeholder={t('send.problemHint')}
                placeholderTextColor={theme.colors.textFaint}
                style={[
                  styles.area,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.line,
                    backgroundColor: theme.colors.surface,
                    textAlign: dir.textAlign,
                  },
                ]}
              />
              <Spacer size="xs" />
              <AppText size="tiny" muted>
                {t('common.noPatientNames')}
              </AppText>

              <Spacer size="lg" />
              <AppText size="small" weight="700" muted style={{ marginBottom: 6 }}>
                {t('send.expectedReturn')}
              </AppText>
              <Row style={{ gap: 8 }}>
                <Button title="−" variant="ghost" onPress={() => setExtraDays((d) => d - 1)} style={{ minWidth: 56 }} />
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: theme.spacing.sm,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.surface,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: theme.colors.line,
                  }}
                >
                  <AppText size="body" weight="700">
                    {formatDate(suggested)}
                  </AppText>
                  <AppText size="tiny" muted>
                    {t('send.deadline', { count: deadlineDays })}
                  </AppText>
                </View>
                <Button title="+" variant="ghost" onPress={() => setExtraDays((d) => d + 1)} style={{ minWidth: 56 }} />
              </Row>

              <Spacer size="md" />
              <Button title={t('send.addPhoto')} icon="camera-outline" variant="secondary" block onPress={addPhoto} />
              {photo ? (
                <AppText size="tiny" muted style={{ marginTop: 6 }}>
                  {photo.split('/').pop()}
                </AppText>
              ) : null}

              <Spacer size="lg" />
              <View
                style={{
                  flexDirection: dir.row,
                  alignItems: 'center',
                  gap: 10,
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.brandSoft,
                }}
              >
                <Icon name="bell-outline" size={20} color={theme.colors.brand} />
                <AppText size="small" weight="600" style={{ flex: 1 }} color={theme.colors.brand}>
                  {t('send.remindScheduled')}
                </AppText>
              </View>
            </>
          ) : null}
        </Entry>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.line }]}>
        {step < 2 ? (
          <Row style={{ gap: 10 }}>
            {step > 0 ? (
              <Button title={t('common.back')} icon="arrow-left" variant="ghost" onPress={goBack} style={{ flex: 1 }} />
            ) : null}
            <Button
              title={t('common.next')}
              icon="arrow-right"
              onPress={goNext}
              disabled={(step === 0 && chosen.length === 0) || (step === 1 && !company)}
              block={step === 0}
              style={step > 0 ? { flex: 2 } : undefined}
            />
          </Row>
        ) : (
          <>
            <Button title={t('send.saveAndPrint')} icon="printer-outline" loading={busy} block onPress={() => trySave(true)} />
            <Spacer size="sm" />
            <Row style={{ gap: 10 }}>
              <Button title={t('common.back')} icon="arrow-left" variant="ghost" onPress={goBack} style={{ flex: 1 }} />
              <Button title={t('send.saveOnly')} variant="ghost" loading={busy} onPress={() => trySave(false)} style={{ flex: 1 }} />
            </Row>
          </>
        )}
      </View>

      {/* Lend a spare (version 2) */}
      <Modal visible={askLend} transparent animationType="fade" onRequestClose={() => setAskLend(false)}>
        <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <Row style={{ gap: 8 }}>
              <Icon name="swap-horizontal" size={24} color={theme.colors.due} />
              <AppText size="section" weight="700">
                {t('send.lendSpare')}
              </AppText>
            </Row>
            <Spacer size="sm" />
            <AppText size="body" muted>
              {t('send.lendSpareBody')}
            </AppText>
            <Spacer size="lg" />
            <Button
              title={t('common.yes')}
              block
              onPress={() => {
                setAskLend(false);
                success();
                save(true);
              }}
            />
            <Spacer size="sm" />
            <Button
              title={t('common.no')}
              variant="ghost"
              block
              onPress={() => {
                setAskLend(false);
                save(true);
              }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

/** A small rounded icon tile (brand tinted). */
function IconTile({ name, color, background, size = 44 }: { name: React.ComponentProps<typeof Icon>['name']; color: string; background: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background,
      }}
    >
      <Icon name={name} size={22} color={color} />
    </View>
  );
}

/** The quest-style check box used on the selectable mini cards. */
function QCheck({ on }: { on: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: on ? theme.colors.brand : theme.colors.line,
        backgroundColor: on ? theme.colors.brand : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {on ? <Icon name="check" size={16} color="#FFFFFF" /> : null}
    </View>
  );
}

function miniCardStyle(theme: ReturnType<typeof useTheme>, selected: boolean) {
  return {
    padding: theme.spacing.md,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
    borderColor: selected ? theme.colors.brand : theme.colors.line,
    ...cardShadow(theme.mode, 1),
  };
}

function DeviceMiniCard({ device, selected, onPress }: { device: DeviceWithTrip; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { t } = useT();
  const dir = useDirection();
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={{ marginBottom: theme.spacing.sm }}>
      <View style={miniCardStyle(theme, selected)}>
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12 }}>
          <IconTile name="devices" color={theme.colors.brand} background={theme.colors.brandSoft} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText size="body" weight="700">
              {device.type} · {device.brand}
            </AppText>
            <AppText size="small" muted>
              {device.inventory_no} · {device.department}
            </AppText>
          </View>
          <QCheck on={selected} />
        </View>
        {device.critical_department ? (
          <>
            <Spacer size="sm" />
            <Tag label={t('device.criticalBadge')} tone="crit" icon="alert" />
          </>
        ) : null}
      </View>
    </PressScale>
  );
}

function CompanyMiniCard({
  company,
  selected,
  covered,
  onPress,
}: {
  company: CompanyWithStats;
  selected: boolean;
  covered: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useT();
  const dir = useDirection();
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={{ marginBottom: theme.spacing.sm }}>
      <View style={miniCardStyle(theme, selected)}>
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12 }}>
          <Gradient
            colors={gradients.brand}
            radius={14}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="office-building" size={22} color="#FFFFFF" />
          </Gradient>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText size="body" weight="700">
              {company.name}
            </AppText>
            <AppText size="small" muted numberOfLines={1}>
              {company.contact_person}
            </AppText>
          </View>
          {selected ? <QCheck on /> : null}
        </View>
        <Spacer size="sm" />
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          <Tag
            label={covered ? t('send.contractUnder') : t('send.contractOut')}
            tone={covered ? 'ok' : 'warn'}
            icon={covered ? 'shield-check-outline' : 'shield-alert-outline'}
          />
          <Tag label={t('send.deadline', { count: company.contract?.deadline_days ?? 7 })} icon="clock-outline" />
        </Row>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  area: {
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  backdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 20, padding: 20 },
});

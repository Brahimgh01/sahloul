// Send a device to a company: 3 short steps, 3 taps for the common case (spec 5.3).
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Tag } from '@/components/StatusChip';
import { AppText, Button, Card, Divider, Icon, ProgressDots, Row, Spacer } from '@/components/ui';
import type { CompanyWithStats, DeviceWithTrip } from '@/data/queries';
import { insertRow, updateRow } from '@/db/repo';
import { useDirection, useT } from '@/i18n';
import { addBusinessDays, addDays, isoDate, formatDate } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';
import { haptic, success } from '@/services/feedback';
import { scheduleTripReminders } from '@/services/notifications';
import { printDispatchNote } from '@/services/pdf';
import { useSettings } from '@/store/settings';
import { useWork } from '@/store/work';
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
  const [companyId, setCompanyId] = useState<string | null>(null);
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
  const steps = [t('send.step1'), t('send.step2'), t('send.step3')];

  const toggle = (id: string) => {
    haptic('select');
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
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
      <View style={{ padding: theme.spacing.lg }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <AppText size="title" weight="700">
            {t('send.title')}
          </AppText>
          <AppText size="small" muted>
            {t('common.step')} {step + 1}/3
          </AppText>
        </Row>
        <Spacer size="md" />
        <ProgressDots count={3} index={step} />
        <Spacer size="md" />
        <Row style={{ gap: 8 }}>
          {steps.map((s, i) => (
            <AppText key={s} size="small" weight={i === step ? '700' : '400'} color={i === step ? theme.colors.primary : theme.colors.textMuted}>
              {i + 1}. {s}
            </AppText>
          ))}
        </Row>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }}>
        {step === 0 ? (
          <>
            <AppText size="body" weight="600">
              {t('send.pickDevices')}
            </AppText>
            <Spacer size="sm" />
            <View style={[styles.search, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border, flexDirection: dir.row }]}>
              <Icon name="magnify" size={20} color={theme.colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('devices.searchPlaceholder')}
                placeholderTextColor={theme.colors.textFaint}
                style={[styles.input, { color: theme.colors.text, textAlign: dir.textAlign }]}
              />
            </View>
            <Spacer size="md" />
            {selectable.map((d) => (
              <SelectRow
                key={d.id}
                device={d}
                selected={selected.includes(d.id)}
                onPress={() => toggle(d.id)}
              />
            ))}
          </>
        ) : null}

        {step === 1 ? (
          <>
            <AppText size="body" weight="600">
              {t('send.pickCompany')}
            </AppText>
            <Spacer size="sm" />
            {companies.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  haptic('select');
                  setCompanyId(c.id);
                  setExtraDays(0);
                }}
                style={{ marginBottom: theme.spacing.sm }}
              >
                <Card style={companyId === c.id ? { borderColor: theme.colors.primary, borderWidth: 2 } : undefined}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <AppText size="body" weight="600">
                        {c.name}
                      </AppText>
                      <AppText size="small" muted>
                        {c.contact_person}
                      </AppText>
                    </View>
                    {companyId === c.id ? <Icon name="check-circle" size={22} color={theme.colors.primary} /> : null}
                  </Row>
                  <Spacer size="sm" />
                  <Row style={{ gap: 8, flexWrap: 'wrap' }}>
                    <Tag label={t('companies.deadlineDays', { count: c.contract?.deadline_days ?? 7 })} icon="calendar-clock" color={theme.colors.textMuted} />
                    {c.contract ? <Tag label={contractLabel(t, c, chosen)} icon="file-sign" color={theme.colors.info} /> : null}
                  </Row>
                </Card>
              </Pressable>
            ))}

            <Spacer size="lg" />
            <AppText size="body" weight="600">
              {t('send.problemLabel')}
            </AppText>
            <Spacer size="sm" />
            <TextInput
              value={problem}
              onChangeText={setProblem}
              multiline
              placeholder={t('send.problemHint')}
              placeholderTextColor={theme.colors.textFaint}
              style={[styles.area, { color: theme.colors.text, borderColor: theme.colors.border, textAlign: dir.textAlign }]}
            />
            <Spacer size="sm" />
            <AppText size="tiny" muted>
              {t('common.noPatientNames')}
            </AppText>

            <Spacer size="md" />
            <Button title={t('send.addPhoto')} icon="camera-outline" variant="secondary" onPress={addPhoto} />
            {photo ? (
              <AppText size="tiny" muted style={{ marginTop: 6 }}>
                {photo.split('/').pop()}
              </AppText>
            ) : null}

            <Spacer size="md" />
            <AppText size="body" weight="600">
              {t('send.expectedReturn')}
            </AppText>
            <Spacer size="sm" />
            <Row style={{ gap: 8 }}>
              <Button title="−" variant="secondary" onPress={() => setExtraDays((d) => d - 1)} style={{ minWidth: 56 }} />
              <Card style={{ flex: 1, alignItems: 'center' }}>
                <AppText size="body" weight="700">
                  {formatDate(suggested)}
                </AppText>
                <AppText size="tiny" muted>
                  {t('send.deadline', { count: deadlineDays })}
                </AppText>
              </Card>
              <Button title="+" variant="secondary" onPress={() => setExtraDays((d) => d + 1)} style={{ minWidth: 56 }} />
            </Row>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Card>
              <AppText size="section" weight="700">
                {t('send.step3')}
              </AppText>
              <Spacer size="sm" />
              <AppText size="small" muted>
                {t('doc.company')}: {company?.name}
              </AppText>
              <AppText size="small" muted>
                {t('send.expectedReturn')}: {formatDate(suggested)}
              </AppText>
              {problem ? <AppText size="small">{problem}</AppText> : null}
            </Card>

            <Spacer size="md" />
            {chosen.map((d) => (
              <Card key={d.id} style={{ marginBottom: theme.spacing.sm }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <AppText size="body" weight="600">
                      {d.type} · {d.inventory_no}
                    </AppText>
                    <AppText size="small" muted>
                      {d.department}
                    </AppText>
                  </View>
                  {d.critical_department ? <Tag label={t('device.criticalBadge')} icon="alert" color={theme.colors.critical} /> : null}
                </Row>
                <Divider />
                <Spacer size="xs" />
                <AppText size="tiny" muted>
                  {t('send.remindScheduled')}
                </AppText>
              </Card>
            ))}
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        {step < 2 ? (
          <Row style={{ gap: 10 }}>
            <Button title={t('common.back')} variant="ghost" onPress={goBack} style={{ flex: 1 }} />
            <Button
              title={t('common.next')}
              icon="chevron-right"
              onPress={goNext}
              disabled={(step === 0 && chosen.length === 0) || (step === 1 && !company)}
              style={{ flex: 2 }}
            />
          </Row>
        ) : (
          <>
            <Button title={t('send.saveAndPrint')} icon="printer-outline" loading={busy} onPress={() => trySave(true)} />
            <Spacer size="sm" />
            <Button title={t('send.saveOnly')} variant="secondary" loading={busy} onPress={() => trySave(false)} />
            <Spacer size="sm" />
            <Button title={t('common.back')} variant="ghost" onPress={goBack} />
          </>
        )}
      </View>

      {/* Lend a spare (version 2) */}
      <Modal visible={askLend} transparent animationType="fade" onRequestClose={() => setAskLend(false)}>
        <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
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

function contractLabel(t: (k: string) => string, c: CompanyWithStats, devices: DeviceWithTrip[]): string {
  const types = c.contract?.covered_device_types ?? [];
  const allCovered = devices.length > 0 && devices.every((d) => types.includes(d.type));
  return allCovered ? t('send.contractUnder') : t('send.contractOut');
}

function SelectRow({ device, selected, onPress }: { device: DeviceWithTrip; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { t } = useT();
  return (
    <Pressable onPress={onPress} style={{ marginBottom: theme.spacing.sm }}>
      <Card style={selected ? { borderColor: theme.colors.primary, borderWidth: 2 } : undefined}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <AppText size="body" weight="600">
              {device.type} · {device.inventory_no}
            </AppText>
            <AppText size="small" muted>
              {device.brand} · {device.department}
            </AppText>
          </View>
          <Icon name={selected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={24} color={selected ? theme.colors.primary : theme.colors.textMuted} />
        </Row>
        {device.critical_department ? (
          <>
            <Spacer size="xs" />
            <Tag label={t('device.criticalBadge')} icon="alert" color={theme.colors.critical} />
          </>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: { minHeight: 48, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, alignItems: 'center', gap: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 8 },
  area: { minHeight: 96, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12, fontSize: 16, textAlignVertical: 'top' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  backdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 20, padding: 20 },
});

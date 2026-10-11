// Check a scanned paper before saving it: type, company, device, date, amount (spec 5.5).
// Visual layer only - the draft data and the save flow are unchanged.
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Entry } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Chip, Display, Group, Icon, Row, RowButton, SearchBar, Spacer, Tag } from '@/components/ui';
import { insertRow } from '@/db/repo';
import { useDirection, useT } from '@/i18n';
import { addDays, formatDate, isoDate } from '@/lib/dates';
import { parseTND } from '@/lib/money';
import { PAPER_TYPE_META } from '@/lib/status';
import type { RootStackParamList } from '@/navigation/types';
import { dropDraft, getDraft } from '@/services/drafts';
import { success } from '@/services/feedback';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaperType } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'PaperCheck'>;

const PAPER_TYPES: PaperType[] = ['invoice', 'contract', 'quote', 'dispatch_note', 'reception_sheet', 'warranty', 'other'];

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export function PaperCheckScreen() {
  const theme = useTheme();
  const { t } = useT();
  const dir = useDirection();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const companies = useWork((s) => s.companies);
  const devices = useWork((s) => s.devices);
  const refresh = useWork((s) => s.refresh);

  const draft = useMemo(() => getDraft(params.draftId), [params.draftId]);

  const [type, setType] = useState<PaperType>(draft?.type ?? 'other');
  const [companyId, setCompanyId] = useState<string | null>(draft?.companyId ?? null);
  const [deviceId, setDeviceId] = useState<string | null>(draft?.deviceId ?? null);
  const [amount, setAmount] = useState(draft?.amount != null ? String(draft.amount) : '');
  const [date, setDate] = useState<Date>(draft?.paperDate ? new Date(draft.paperDate) : new Date());
  const [fileName, setFileName] = useState(draft?.fileName ?? 'paper.pdf');
  const [showDevices, setShowDevices] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!draft) nav.goBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  if (!draft) {
    return (
      <Screen edges={[]}>
        <View style={{ padding: theme.spacing.lg }}>
          <AppText muted>{t('common.loading')}</AppText>
        </View>
      </Screen>
    );
  }

  const device = devices.find((d) => d.id === deviceId) ?? null;

  const deviceResults = devices.filter((d) => {
    const q = search.trim().toLowerCase();
    return !q || `${d.inventory_no} ${d.type} ${d.brand} ${d.department}`.toLowerCase().includes(q);
  });

  const save = async () => {
    setBusy(true);
    try {
      await insertRow('papers', {
        type,
        pages: draft.images.length || 1,
        phone_file_path: draft.pdfPath,
        cloud_url: null,
        text: draft.text,
        text_language: draft.language,
        device_id: deviceId,
        trip_id: draft.tripId,
        company_id: companyId,
        upload_status: 'on_phone',
        words_status: draft.text ? 'read' : 'not_read',
        file_name: fileName,
        amount: parseTND(amount),
        paper_date: isoDate(date),
        thumbnail_path: draft.images[0] ?? null,
      });
      dropDraft(draft.id);
      await refresh();
      success();
      nav.navigate('Tabs', { screen: 'Papers' });
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    color: theme.colors.text,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface2,
    textAlign: dir.textAlign,
  } as const;

  return (
    <Screen edges={[]} hideMic>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 180 }}>
        <Entry>
          <Row style={{ gap: 10 }}>
            <Icon name="file-check-outline" size={26} color={theme.colors.brand} />
            <Display size="title" weight="700">
              {t('scan.checkTitle')}
            </Display>
          </Row>
        </Entry>

        {/* The scanned document on a white "paper" card. */}
        <Entry delay={60}>
          <Spacer size="lg" />
          <Card style={[styles.paper, { borderColor: 'rgba(15,23,42,0.08)' }]}>
            <Row style={{ justifyContent: 'space-between', gap: 10 }}>
              <AppText size="small" weight="700" color="#0F172A">
                {t('scan.pages', { count: draft.images.length || 1 })}
              </AppText>
              {draft.text ? (
                <Tag label={t('scan.suggested')} tone="ok" icon="text-recognition" />
              ) : (
                <Tag label={t('scan.wordsNotRead')} tone="warn" icon="alert" />
              )}
            </Row>
            <View style={styles.paperLine} />
            <AppText size="small" color="#334155" style={[styles.paperText, { fontFamily: MONO }]}>
              {draft.text || t('scan.wordsNotRead')}
            </AppText>
          </Card>
        </Entry>

        {/* Editable fields. */}
        <Entry delay={120}>
          <Group style={{ marginTop: theme.spacing.lg, paddingVertical: 4 }}>
            <FieldRow label={t('scan.type')}>
              <View style={styles.chips}>
                {PAPER_TYPES.map((p) => (
                  <Chip
                    key={p}
                    size="sm"
                    label={t(PAPER_TYPE_META[p].i18nKey)}
                    icon={PAPER_TYPE_META[p].icon}
                    selected={type === p}
                    onPress={() => setType(p)}
                  />
                ))}
              </View>
            </FieldRow>

            <FieldRow label={t('scan.company')}>
              <View style={styles.chips}>
                <Chip size="sm" label={t('common.none')} selected={companyId === null} onPress={() => setCompanyId(null)} />
                {companies.map((c) => (
                  <Chip key={c.id} size="sm" label={c.name} selected={companyId === c.id} onPress={() => setCompanyId(c.id)} />
                ))}
              </View>
            </FieldRow>

            <FieldRow label={t('scan.device')}>
              <Button
                title={device ? `${device.type} · ${device.inventory_no}` : t('common.none')}
                icon="devices"
                variant="secondary"
                onPress={() => setShowDevices(true)}
                block
              />
            </FieldRow>

            <FieldRow label={t('scan.date')}>
              <Row style={{ gap: 8 }}>
                <Button title="−" variant="secondary" onPress={() => setDate((d) => addDays(d, -1))} style={{ minWidth: 56 }} />
                <View style={[styles.dateBox, { flex: 1, backgroundColor: theme.colors.surface2, borderColor: theme.colors.line }]}>
                  <AppText size="body" weight="700">
                    {formatDate(isoDate(date))}
                  </AppText>
                </View>
                <Button title="+" variant="secondary" onPress={() => setDate((d) => addDays(d, 1))} style={{ minWidth: 56 }} />
              </Row>
            </FieldRow>

            <FieldRow label={t('scan.amount')}>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.000"
                placeholderTextColor={theme.colors.textFaint}
                style={[styles.input, inputStyle]}
              />
            </FieldRow>

            <FieldRow label={t('scan.fileName')}>
              <TextInput
                value={fileName}
                onChangeText={setFileName}
                placeholderTextColor={theme.colors.textFaint}
                style={[styles.input, inputStyle]}
              />
            </FieldRow>
          </Group>
        </Entry>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.line }]}>
        <Button title={t('scan.savePaper')} icon="content-save-outline" loading={busy} onPress={save} block />
      </View>

      {/* Device picker */}
      <Modal visible={showDevices} transparent animationType="slide" onRequestClose={() => setShowDevices(false)}>
        <View style={[styles.modalWrap, { backgroundColor: theme.colors.bg }]}>
          <Row style={{ justifyContent: 'space-between', padding: theme.spacing.lg }}>
            <Display size="lg" weight="700">
              {t('scan.device')}
            </Display>
            <Button title={t('common.close')} variant="ghost" onPress={() => setShowDevices(false)} />
          </Row>
          <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder={t('devices.searchPlaceholder')}
              accessibilityLabel={t('common.search')}
            />
          </View>
          <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: theme.spacing.md }}>
            <Group>
              <RowButton
                icon="close-circle-outline"
                iconColors={['#8B98AD', '#54627A']}
                title={t('common.none')}
                chevron={false}
                onPress={() => {
                  setDeviceId(null);
                  setShowDevices(false);
                }}
              />
              {deviceResults.map((d) => (
                <RowButton
                  key={d.id}
                  icon="devices"
                  title={`${d.type} · ${d.inventory_no}`}
                  subtitle={d.department}
                  chevron={false}
                  onPress={() => {
                    setDeviceId(d.id);
                    setShowDevices(false);
                  }}
                />
              ))}
            </Group>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ paddingVertical: theme.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.line }}>
      <AppText size="small" muted>
        {label}
      </AppText>
      <Spacer size="sm" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { backgroundColor: '#FFFFFF' },
  paperLine: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(15,23,42,0.10)', marginVertical: 12 },
  paperText: { lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateBox: { minHeight: 48, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 52, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, fontSize: 16 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  modalWrap: { flex: 1 },
});

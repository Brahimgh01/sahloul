// Check a scanned paper before saving it: type, company, device, date, amount (spec 5.5).
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Chip, Icon, Row, Spacer } from '@/components/ui';
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

  return (
    <Screen edges={[]} hideMic>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 180 }}>
        <Row style={{ gap: 10 }}>
          <Icon name="file-check-outline" size={26} color={theme.colors.primary} />
          <AppText size="title" weight="700">
            {t('scan.checkTitle')}
          </AppText>
        </Row>

        <Spacer size="lg" />
        <Card>
          <Row style={{ gap: 10 }}>
            <Icon name="file-multiple-outline" size={22} color={theme.colors.textMuted} />
            <AppText size="body" weight="600">
              {t('scan.pages', { count: draft.images.length || 1 })}
            </AppText>
          </Row>
          <Spacer size="sm" />
          <AppText size="small" muted>
            {draft.text ? `${draft.text.slice(0, 160)}${draft.text.length > 160 ? '…' : ''}` : t('scan.wordsNotRead')}
          </AppText>
        </Card>

        {/* Type */}
        <Spacer size="lg" />
        <AppText size="body" weight="600">
          {t('scan.type')}
        </AppText>
        <Spacer size="sm" />
        <View style={styles.chips}>
          {PAPER_TYPES.map((p) => (
            <Chip key={p} label={t(PAPER_TYPE_META[p].i18nKey)} icon={PAPER_TYPE_META[p].icon} selected={type === p} onPress={() => setType(p)} />
          ))}
        </View>

        {/* Company */}
        <Spacer size="lg" />
        <AppText size="body" weight="600">
          {t('scan.company')}
        </AppText>
        <Spacer size="sm" />
        <View style={styles.chips}>
          <Chip label={t('common.none')} selected={companyId === null} onPress={() => setCompanyId(null)} />
          {companies.map((c) => (
            <Chip key={c.id} label={c.name} selected={companyId === c.id} onPress={() => setCompanyId(c.id)} />
          ))}
        </View>

        {/* Device */}
        <Spacer size="lg" />
        <AppText size="body" weight="600">
          {t('scan.device')}
        </AppText>
        <Spacer size="sm" />
        <Button
          title={device ? `${device.type} · ${device.inventory_no}` : t('common.none')}
          icon="devices"
          variant="secondary"
          onPress={() => setShowDevices(true)}
        />

        {/* Date */}
        <Spacer size="lg" />
        <AppText size="body" weight="600">
          {t('scan.date')}
        </AppText>
        <Spacer size="sm" />
        <Row style={{ gap: 8 }}>
          <Button title="−" variant="secondary" onPress={() => setDate((d) => addDays(d, -1))} style={{ minWidth: 56 }} />
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <AppText size="body" weight="700">
              {formatDate(isoDate(date))}
            </AppText>
          </Card>
          <Button title="+" variant="secondary" onPress={() => setDate((d) => addDays(d, 1))} style={{ minWidth: 56 }} />
        </Row>

        {/* Amount */}
        <Spacer size="lg" />
        <AppText size="body" weight="600">
          {t('scan.amount')}
        </AppText>
        <Spacer size="sm" />
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.000"
          placeholderTextColor={theme.colors.textFaint}
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, textAlign: dir.textAlign }]}
        />

        {/* File name */}
        <Spacer size="lg" />
        <AppText size="body" weight="600">
          {t('scan.fileName')}
        </AppText>
        <Spacer size="sm" />
        <TextInput
          value={fileName}
          onChangeText={setFileName}
          placeholderTextColor={theme.colors.textFaint}
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, textAlign: dir.textAlign }]}
        />
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <Button title={t('scan.savePaper')} icon="content-save-outline" loading={busy} onPress={save} />
      </View>

      {/* Device picker */}
      <Modal visible={showDevices} transparent animationType="slide" onRequestClose={() => setShowDevices(false)}>
        <View style={[styles.modalWrap, { backgroundColor: theme.colors.bg }]}>
          <Row style={{ justifyContent: 'space-between', padding: theme.spacing.lg }}>
            <AppText size="section" weight="700">
              {t('scan.device')}
            </AppText>
            <Button title={t('common.close')} variant="ghost" onPress={() => setShowDevices(false)} />
          </Row>
          <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('devices.searchPlaceholder')}
              placeholderTextColor={theme.colors.textFaint}
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, textAlign: dir.textAlign, marginBottom: theme.spacing.md }]}
            />
          </View>
          <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 0 }}>
            <Pressable onPress={() => { setDeviceId(null); setShowDevices(false); }} style={{ marginBottom: theme.spacing.sm }}>
              <Card>
                <AppText size="body">{t('common.none')}</AppText>
              </Card>
            </Pressable>
            {deviceResults.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => {
                  setDeviceId(d.id);
                  setShowDevices(false);
                }}
                style={{ marginBottom: theme.spacing.sm }}
              >
                <Card>
                  <AppText size="body" weight="600">
                    {d.type} · {d.inventory_no}
                  </AppText>
                  <AppText size="small" muted>
                    {d.department}
                  </AppText>
                </Card>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { minHeight: 52, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, fontSize: 16 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  modalWrap: { flex: 1 },
});

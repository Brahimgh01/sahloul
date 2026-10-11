// Import a CSV from the classmate app (the only shared link - spec section 7).
// Redesign: a calm dashed drop-zone, a sample-format card, a mono preview and a success state.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { Entry } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { AppText, Badge, Button, Card, Display, Group, GroupHeading, Icon, Row, Spacer } from '@/components/ui';
import { useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { commitImport, csvToDeviceRows, previewImport, type ImportPreview } from '@/services/csv';
import { error, success } from '@/services/feedback';
import { readTextFile } from '@/services/papers';
import { celebrate } from '@/store/feedback';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';
import { cardShadow } from '@/theme/tokens';
import type { CsvDeviceRow } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Step = 'pick' | 'preview' | 'done';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const SAMPLE_ROW = 'INV-0104,SN-5521,Printer,Cardiology,Paper jam,2026-01-12';

export function ImportCsvScreen() {
  const theme = useTheme();
  const { t } = useT();
  const nav = useNavigation<Nav>();
  const refresh = useWork((s) => s.refresh);

  const [step, setStep] = useState<Step>('pick');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState({ inserted: 0, updated: 0 });
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      setBusy(true);
      const text = await readTextFile(res.assets[0].uri);
      const rows = csvToDeviceRows(text);
      const p = await previewImport(rows);
      setPreview(p);
      setStep('preview');
    } catch {
      error();
      setPreview(null);
      setStep('pick');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const r = await commitImport(preview.rows);
      setResult(r);
      await refresh();
      success();
      celebrate();
      setStep('done');
    } catch {
      error();
    } finally {
      setBusy(false);
    }
  };

  const renderRows = (rows: CsvDeviceRow[], color: string, sign: string) =>
    rows.slice(0, 6).map((r, i) => (
      <Row key={`${r.inventory_no}-${i}`} style={{ gap: 8, paddingVertical: 5 }}>
        <Icon name={sign === '+' ? 'plus-circle' : 'pencil-circle'} size={16} color={color} />
        <AppText size="small" weight="700" style={{ fontFamily: MONO }}>
          {r.inventory_no}
        </AppText>
        <AppText size="small" muted numberOfLines={1} style={{ flex: 1, fontFamily: MONO }}>
          {[r.type, r.department].filter(Boolean).join(' · ')}
        </AppText>
      </Row>
    ));

  const dropZone = {
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center' as const,
    ...cardShadow(theme.mode, 1),
  };

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }}>
        {step === 'pick' ? (
          <>
            <Entry>
              <View style={dropZone}>
                <View
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 26,
                    backgroundColor: theme.colors.brandSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="cloud-upload-outline" size={44} color={theme.colors.brand} />
                </View>
                <Spacer size="md" />
                <AppText size="body" weight="700" align="center">
                  {t('importFlow.choose')}
                </AppText>
                <Spacer size="xs" />
                <AppText size="small" muted align="center">
                  {t('importFlow.columnsHint')}
                </AppText>
              </View>
            </Entry>

            <Spacer size="lg" />
            <Entry delay={80}>
              <Button title={t('importFlow.choose')} icon="folder-open-outline" block loading={busy} onPress={pick} />
            </Entry>

            <Entry delay={140}>
              <GroupHeading>{t('importFlow.columnsHint')}</GroupHeading>
              <Group>
                <View style={{ paddingVertical: theme.spacing.md, gap: theme.spacing.md }}>
                  <View style={{ backgroundColor: theme.colors.surface2, borderRadius: 12, padding: theme.spacing.md }}>
                    <AppText size="tiny" weight="700" style={{ fontFamily: MONO }}>
                      inventory_no,serial_no,type,department,problem,reported_date
                    </AppText>
                    <Spacer size="xs" />
                    <AppText size="tiny" muted style={{ fontFamily: MONO }}>
                      {SAMPLE_ROW}
                    </AppText>
                  </View>
                  <Row style={{ gap: 8 }}>
                    <Icon name="shield-check-outline" size={18} color={theme.colors.done} />
                    <AppText size="small" muted style={{ flex: 1 }}>
                      {t('importFlow.neverDelete')}
                    </AppText>
                  </Row>
                </View>
              </Group>
            </Entry>

            <Spacer size="lg" />
            <Entry delay={200}>
              {/* Disabled until a file has been chosen. */}
              <Button title={t('importFlow.confirm')} icon="tray-arrow-down" block disabled onPress={() => {}} />
            </Entry>
          </>
        ) : null}

        {step === 'preview' && preview ? (
          <>
            <Entry>
              <Card>
                <AppText size="section" weight="700">
                  {t('importFlow.preview')}
                </AppText>
                <Spacer size="md" />
                <Row style={{ gap: 8, flexWrap: 'wrap' }}>
                  <Badge label={t('importFlow.newRows', { count: preview.newRows.length })} color={theme.colors.done} icon="plus-circle" />
                  <Badge label={t('importFlow.changedRows', { count: preview.changed.length })} color={theme.colors.due} icon="pencil-circle" />
                  <Badge label={t('importFlow.unchanged', { count: preview.unchanged.length })} color={theme.colors.textMuted} icon="equal" />
                </Row>

                {preview.newRows.length > 0 ? (
                  <>
                    <Spacer size="lg" />
                    <AppText size="small" weight="700" color={theme.colors.done}>
                      {t('importFlow.newRows', { count: preview.newRows.length })}
                    </AppText>
                    <View style={{ marginTop: theme.spacing.sm, backgroundColor: theme.colors.surface2, borderRadius: 12, padding: theme.spacing.md }}>
                      {renderRows(preview.newRows, theme.colors.done, '+')}
                    </View>
                  </>
                ) : null}

                {preview.changed.length > 0 ? (
                  <>
                    <Spacer size="lg" />
                    <AppText size="small" weight="700" color={theme.colors.due}>
                      {t('importFlow.changedRows', { count: preview.changed.length })}
                    </AppText>
                    <View style={{ marginTop: theme.spacing.sm, backgroundColor: theme.colors.surface2, borderRadius: 12, padding: theme.spacing.md }}>
                      {renderRows(preview.changed, theme.colors.due, '~')}
                    </View>
                  </>
                ) : null}
              </Card>
            </Entry>

            <Spacer size="lg" />
            <Row style={{ gap: 8 }}>
              <Icon name="shield-check-outline" size={18} color={theme.colors.done} />
              <AppText size="small" muted style={{ flex: 1 }}>
                {t('importFlow.neverDelete')}
              </AppText>
            </Row>

            <Spacer size="xl" />
            <Entry delay={80}>
              <Button title={t('importFlow.confirm')} icon="tray-arrow-down" block loading={busy} disabled={!preview} onPress={confirm} />
            </Entry>
            <Spacer size="sm" />
            <Button title={t('common.cancel')} variant="ghost" block onPress={() => nav.goBack()} />
          </>
        ) : null}

        {step === 'done' ? (
          <>
            <Spacer size="xxl" />
            <Entry>
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: 55,
                    backgroundColor: theme.colors.brandSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="check-circle-outline" size={54} color={theme.colors.done} />
                </View>
                <Spacer size="lg" />
                <Display size="section" align="center">
                  {t('importFlow.done')}
                </Display>
                <Spacer size="md" />
                <Row style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Badge label={t('importFlow.newRows', { count: result.inserted })} color={theme.colors.done} icon="plus-circle" />
                  <Badge label={t('importFlow.changedRows', { count: result.updated })} color={theme.colors.due} icon="pencil-circle" />
                </Row>
              </View>
            </Entry>
            <Spacer size="xxl" />
            <Button title={t('common.done')} block onPress={() => nav.goBack()} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

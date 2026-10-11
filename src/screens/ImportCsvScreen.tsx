// Import a CSV from the classmate app (the only shared link - spec section 7).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Badge, Button, Card, Icon, Row, Spacer } from '@/components/ui';
import { useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { commitImport, csvToDeviceRows, previewImport, type ImportPreview } from '@/services/csv';
import { error, success } from '@/services/feedback';
import { readTextFile } from '@/services/papers';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';
import type { CsvDeviceRow } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Step = 'pick' | 'preview' | 'done';

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
      setStep('done');
    } catch {
      error();
    } finally {
      setBusy(false);
    }
  };

  const renderRows = (rows: CsvDeviceRow[], color: string, sign: string) =>
    rows.slice(0, 6).map((r, i) => (
      <Row key={`${r.inventory_no}-${i}`} style={{ gap: 8, paddingVertical: 4 }}>
        <Icon name={sign === '+' ? 'plus-circle' : 'pencil-circle'} size={16} color={color} />
        <AppText size="small" weight="600">
          {r.inventory_no}
        </AppText>
        <AppText size="small" muted numberOfLines={1} style={{ flex: 1 }}>
          {[r.type, r.department].filter(Boolean).join(' · ')}
        </AppText>
      </Row>
    ));

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }}>
        <AppText size="title" weight="700">
          {t('importFlow.title')}
        </AppText>
        <Spacer size="sm" />
        <AppText size="small" muted>
          {t('importFlow.columnsHint')}
        </AppText>

        {step === 'pick' ? (
          <>
            <Spacer size="xl" />
            <Card>
              <Row style={{ gap: 12 }}>
                <Icon name="file-delimited-outline" size={34} color={theme.colors.primary} />
                <View style={{ flex: 1 }}>
                  <AppText size="body" weight="600">
                    {t('importFlow.choose')}
                  </AppText>
                  <AppText size="tiny" muted>
                    CSV
                  </AppText>
                </View>
              </Row>
              <Spacer size="lg" />
              <Button title={t('importFlow.choose')} icon="folder-open-outline" loading={busy} onPress={pick} />
            </Card>
            <Spacer size="lg" />
            <Row style={{ gap: 8 }}>
              <Icon name="shield-check-outline" size={18} color={theme.colors.done} />
              <AppText size="small" muted style={{ flex: 1 }}>
                {t('importFlow.neverDelete')}
              </AppText>
            </Row>
          </>
        ) : null}

        {step === 'preview' && preview ? (
          <>
            <Spacer size="xl" />
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
                  {renderRows(preview.newRows, theme.colors.done, '+')}
                </>
              ) : null}

              {preview.changed.length > 0 ? (
                <>
                  <Spacer size="lg" />
                  <AppText size="small" weight="700" color={theme.colors.due}>
                    {t('importFlow.changedRows', { count: preview.changed.length })}
                  </AppText>
                  {renderRows(preview.changed, theme.colors.due, '~')}
                </>
              ) : null}
            </Card>

            <Spacer size="lg" />
            <Row style={{ gap: 8 }}>
              <Icon name="shield-check-outline" size={18} color={theme.colors.done} />
              <AppText size="small" muted style={{ flex: 1 }}>
                {t('importFlow.neverDelete')}
              </AppText>
            </Row>

            <Spacer size="xl" />
            <Button title={t('importFlow.confirm')} icon="check" loading={busy} onPress={confirm} />
            <Spacer size="sm" />
            <Button title={t('common.cancel')} variant="ghost" onPress={() => nav.goBack()} />
          </>
        ) : null}

        {step === 'done' ? (
          <>
            <Spacer size="xxl" />
            <View style={{ alignItems: 'center' }}>
              <View style={[styles.doneCircle, { backgroundColor: theme.colors.primarySoft }]}>
                <Icon name="check-circle-outline" size={54} color={theme.colors.done} />
              </View>
              <Spacer size="lg" />
              <AppText size="section" weight="700">
                {t('importFlow.done')}
              </AppText>
              <Spacer size="sm" />
              <Row style={{ gap: 8 }}>
                <Badge label={t('importFlow.newRows', { count: result.inserted })} color={theme.colors.done} icon="plus-circle" />
                <Badge label={t('importFlow.changedRows', { count: result.updated })} color={theme.colors.due} icon="pencil-circle" />
              </Row>
            </View>
            <Spacer size="xxl" />
            <Button title={t('common.done')} onPress={() => nav.goBack()} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  doneCircle: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center' },
});

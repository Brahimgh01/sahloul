// Scan a paper: find the page, straighten it, read the words (spec 5.5).
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Chip, Icon, Row, Spacer } from '@/components/ui';
import { getCompany, getDevice } from '@/data/queries';
import { useT } from '@/i18n';
import { isoDate } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';
import { putDraft } from '@/services/drafts';
import { error } from '@/services/feedback';
import { recognizeTexts } from '@/services/ocr';
import { paperFileName, saveImagesAsPdf } from '@/services/papers';
import { scanDocument } from '@/services/scanner';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaperType } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Scan'>;

type Mode = 'clean' | 'color' | 'original';

function guessType(text: string): PaperType {
  const s = text.toLowerCase();
  if (/(facture|invoice|فاتورة)/.test(s)) return 'invoice';
  if (/(contrat|contract|عقد)/.test(s)) return 'contract';
  if (/(devis|quote|عرض سعر)/.test(s)) return 'quote';
  if (/(bon de sortie|dispatch|إخراج)/.test(s)) return 'dispatch_note';
  if (/(r[ée]ception|fiche|استلام)/.test(s)) return 'reception_sheet';
  if (/(garantie|warranty|ضمان)/.test(s)) return 'warranty';
  return 'other';
}

function guessAmount(text: string): number | null {
  const m = /(\d[\d\s.,]{0,12})\s*(?:tnd|dt|dinar)/i.exec(text) ?? /(?:total|montant|المجموع|المبلغ)[^\d]{0,12}(\d[\d\s.,]{0,12})/i.exec(text);
  if (!m) return null;
  const cleaned = m[1].replace(/\s/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

export function ScanScreen() {
  const theme = useTheme();
  const { t } = useT();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();

  const [mode, setMode] = useState<Mode>('clean');
  const [busy, setBusy] = useState(false);
  const [labels, setLabels] = useState<{ companyName: string; inventory: string }>({ companyName: '', inventory: '' });

  useEffect(() => {
    (async () => {
      const [dev, comp] = await Promise.all([
        params?.deviceId ? getDevice(params.deviceId) : Promise.resolve(null),
        params?.companyId ? getCompany(params.companyId) : Promise.resolve(null),
      ]);
      setLabels({ companyName: comp?.name ?? '', inventory: dev?.inventory_no ?? '' });
    })();
  }, [params?.deviceId, params?.companyId]);

  const start = async () => {
    setBusy(true);
    try {
      const scan = await scanDocument();
      if (scan.cancelled || scan.images.length === 0) {
        setBusy(false);
        return;
      }
      // One PDF from all pages, stored on the phone, then read the words.
      const date = isoDate(new Date());
      const tempName = paperFileName(date, 'scan', labels.companyName, labels.inventory);
      const pdfPath = await saveImagesAsPdf(scan.images, tempName);
      const ocr = await recognizeTexts(scan.images);

      const type = guessType(ocr.text);
      const fileName = paperFileName(date, type, labels.companyName, labels.inventory);

      const draftId = putDraft({
        images: scan.images,
        pdfPath,
        text: ocr.text,
        language: ocr.language,
        fileName,
        deviceId: params?.deviceId ?? null,
        tripId: params?.tripId ?? null,
        companyId: params?.companyId ?? null,
        type,
        amount: guessAmount(ocr.text),
        paperDate: date,
      });
      setBusy(false);
      nav.replace('PaperCheck', { draftId });
    } catch {
      error();
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]} hideMic>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }}>
        <AppText size="title" weight="700">
          {t('scan.title')}
        </AppText>

        <Spacer size="lg" />
        <Card>
          <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl }}>
            <View style={[styles.icon, { backgroundColor: theme.colors.primarySoft }]}>
              <Icon name="line-scan" size={54} color={theme.colors.primary} />
            </View>
            <Spacer size="md" />
            <AppText size="small" muted align="center">
              {t(`scan.${mode}Hint`)}
            </AppText>
          </View>
        </Card>

        <Spacer size="lg" />
        <AppText size="body" weight="600">
          {t('scan.mode')}
        </AppText>
        <Spacer size="sm" />
        <Row style={{ gap: 8, flexWrap: 'wrap' }}>
          <Chip label={t('scan.clean')} selected={mode === 'clean'} onPress={() => setMode('clean')} />
          <Chip label={t('scan.color')} selected={mode === 'color'} onPress={() => setMode('color')} />
          <Chip label={t('scan.original')} selected={mode === 'original'} onPress={() => setMode('original')} />
        </Row>

        {busy ? (
          <>
            <Spacer size="lg" />
            <Row style={{ gap: 10 }}>
              <Icon name="text-recognition" size={22} color={theme.colors.due} />
              <AppText size="body" color={theme.colors.due}>
                {t('scan.reading')}
              </AppText>
            </Row>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <Button title={t('scan.start')} icon="camera-outline" loading={busy} onPress={start} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 120, height: 120, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});

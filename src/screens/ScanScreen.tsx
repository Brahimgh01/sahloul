// Scan a paper: find the page, straighten it, read the words (spec 5.5).
// The real camera + document scanner + ML Kit OCR flow is unchanged; this file
// only dresses the screen: a dark finder, an animated scan line and the
// capture / reading stages.
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Gradient } from '@/components/Gradient';
import { PressScale } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { AppText, Display, Icon, IconButton, Row, Segmented, Spacer } from '@/components/ui';
import { getCompany, getDevice } from '@/data/queries';
import { useT } from '@/i18n';
import { isoDate } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';
import { putDraft } from '@/services/drafts';
import { error } from '@/services/feedback';
import { recognizeTexts } from '@/services/ocr';
import { paperFileName, saveImagesAsPdf } from '@/services/papers';
import { scanDocument } from '@/services/scanner';
import { gradients } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaperType } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Scan'>;

type Mode = 'clean' | 'color' | 'original';

const PAPER_LINE_WIDTHS = ['60%', '100%', '80%', '70%', '88%', '60%', '74%'] as const;

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
  const { t } = useT();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('clean');
  const [busy, setBusy] = useState(false);
  const [labels, setLabels] = useState<{ companyName: string; inventory: string }>({ companyName: '', inventory: '' });

  const stage: 'capture' | 'reading' = busy ? 'reading' : 'capture';
  const modes: { value: Mode; label: string }[] = [
    { value: 'clean', label: t('scan.clean') },
    { value: 'color', label: t('scan.color') },
    { value: 'original', label: t('scan.original') },
  ];

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
      <View style={{ flex: 1, backgroundColor: '#0b1220' }}>
        {/* Top bar */}
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 14 }}>
          <Row>
            <IconButton name="arrow-left" label={t('common.back')} color="#FFFFFF" onPress={() => nav.goBack()} />
            <Display size="lg" weight="700" color="#FFFFFF" align="center" style={{ flex: 1 }}>
              {t('scan.title')}
            </Display>
            <View style={{ width: 44 }} />
          </Row>
          <View style={{ marginTop: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <Segmented options={modes} value={mode} onChange={setMode} />
          </View>
          {stage === 'capture' ? (
            <>
              <Spacer size="sm" />
              <AppText size="small" color="rgba(255,255,255,0.6)" align="center">
                {t(`scan.${mode}Hint`)}
              </AppText>
            </>
          ) : null}
        </View>

        {/* Middle */}
        {stage === 'capture' ? (
          <Finder />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Float>
              <Gradient
                colors={gradients.brand}
                radius={28}
                style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="file-document-outline" size={44} color="#FFFFFF" />
              </Gradient>
            </Float>
            <Spacer size="lg" />
            <AppText size="body" weight="700" color="#FFFFFF" align="center">
              {t('scan.reading')}
            </AppText>
            <Spacer size="sm" />
            <BlinkDots />
          </View>
        )}

        {/* Bottom */}
        <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 12, paddingTop: 12 }}>
          {stage === 'capture' ? (
            <Row style={{ justifyContent: 'center' }}>
              <PressScale onPress={start} accessibilityRole="button" accessibilityLabel={t('scan.start')}>
                <View style={styles.capture}>
                  <Icon name="line-scan" size={30} color="#0b1220" />
                </View>
              </PressScale>
            </Row>
          ) : (
            <AppText size="small" color="rgba(255,255,255,0.8)" align="center">
              {t('scan.reading')}
            </AppText>
          )}
        </View>
      </View>
    </Screen>
  );
}

/** Dark panel with cyan brackets, a paper mock and an animated scan line. */
function Finder() {
  const [height, setHeight] = useState(0);
  return (
    <View
      style={[styles.finder, { margin: 14 }]}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
    >
      <Gradient colors={['#1c2742', '#0e1730']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.paper}>
        {PAPER_LINE_WIDTHS.map((w, i) => (
          <View
            key={i}
            style={{
              height: i === 0 ? 11 : 7,
              width: w,
              borderRadius: 4,
              backgroundColor: i === 0 ? '#94a3b8' : '#cbd5e1',
            }}
          />
        ))}
      </View>
      <Corner style={styles.tl} />
      <Corner style={styles.tr} />
      <Corner style={styles.bl} />
      <Corner style={styles.br} />
      {height > 0 ? <ScanLine height={height} /> : null}
    </View>
  );
}

function Corner({ style }: { style: object }) {
  return <View style={[styles.corner, style]} pointerEvents="none" />;
}

/** Gentle floating badge (respects Reduce motion). */
function Float({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const y = useSharedValue(0);
  useEffect(() => {
    if (theme.reduceMotion) {
      y.value = 0;
      return;
    }
    y.value = withRepeat(withTiming(-8, { duration: 1700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [theme.reduceMotion, y]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={anim}>{children}</Animated.View>;
}

function ScanLine({ height }: { height: number }) {
  const theme = useTheme();
  const y = useSharedValue(height * 0.12);
  useEffect(() => {
    const from = height * 0.12;
    const to = height * 0.8;
    y.value = from;
    if (theme.reduceMotion) {
      y.value = to;
      return;
    }
    y.value = withRepeat(withTiming(to, { duration: 1400, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [height, theme.reduceMotion, y]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View pointerEvents="none" style={[styles.scanline, anim]} />;
}

function BlinkDots() {
  return (
    <Row style={{ gap: 6, justifyContent: 'center' }}>
      {[0, 1, 2].map((i) => (
        <BlinkDot key={i} delay={i * 200} />
      ))}
    </Row>
  );
}

function BlinkDot({ delay }: { delay: number }) {
  const theme = useTheme();
  const o = useSharedValue(0.3);
  useEffect(() => {
    if (theme.reduceMotion) {
      o.value = 1;
      return;
    }
    o.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
  }, [delay, theme.reduceMotion, o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.dot, anim]} />;
}

const styles = StyleSheet.create({
  finder: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paper: {
    width: '66%',
    aspectRatio: 1 / 1.35,
    borderRadius: 10,
    padding: 16,
    gap: 8,
    backgroundColor: '#E8EDF8',
    alignItems: 'flex-start',
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: '#22D3EE',
    borderWidth: 3,
    borderRadius: 6,
  },
  tl: { top: 14, left: 14, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 14, right: 14, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 14, left: 14, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 14, right: 14, borderLeftWidth: 0, borderTopWidth: 0 },
  scanline: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: 0,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#22D3EE',
    shadowColor: '#22D3EE',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22D3EE' },
  capture: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});

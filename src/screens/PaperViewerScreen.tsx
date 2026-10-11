// One paper: the paper itself, the text we read, and actions (spec 5.4).
// Visual layer only - scanning/sharing/printing/deleting are unchanged.
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Entry } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Chip, Display, Group, Icon, KV, Row, Spacer, Tag } from '@/components/ui';
import type { PaperWithRefs } from '@/data/queries';
import { first, softDelete, undelete, updateRow } from '@/db/repo';
import { useT } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { formatTND } from '@/lib/money';
import { PAPER_TYPE_META } from '@/lib/status';
import type { RootStackParamList } from '@/navigation/types';
import { success } from '@/services/feedback';
import { exists, printFile, shareFile } from '@/services/papers';
import { toast } from '@/store/feedback';
import { useWork } from '@/store/work';
import type { Palette } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaperType } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'PaperViewer'>;

const PAPER_TYPES: PaperType[] = ['invoice', 'contract', 'quote', 'dispatch_note', 'reception_sheet', 'warranty', 'other'];

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

function typeColor(colors: Palette, type: PaperType): string {
  if (type === 'invoice') return colors.info;
  if (type === 'contract') return colors.brand;
  return colors.textMuted;
}

export function PaperViewerScreen() {
  const theme = useTheme();
  const { t } = useT();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const refresh = useWork((s) => s.refresh);

  const [paper, setPaper] = useState<PaperWithRefs | null>(null);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    const row = await first<PaperWithRefs>(
      `SELECT p.*, d.inventory_no AS device_label, c.name AS company_name
       FROM papers p
       LEFT JOIN devices d ON d.id = p.device_id
       LEFT JOIN companies c ON c.id = p.company_id
       WHERE p.id = ?`,
      [params.paperId],
    );
    setPaper(row);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.paperId]);

  if (!paper) {
    return (
      <Screen edges={[]}>
        <View style={{ padding: theme.spacing.lg }}>
          <AppText muted>{t('common.loading')}</AppText>
        </View>
      </Screen>
    );
  }

  const meta = PAPER_TYPE_META[paper.type as PaperType] ?? PAPER_TYPE_META.other;
  const color = typeColor(theme.colors, paper.type as PaperType);
  const isImage = /\.(png|jpe?g|webp)$/i.test(paper.phone_file_path ?? '');

  const share = async () => {
    try {
      if (paper.phone_file_path && (await exists(paper.phone_file_path))) {
        const ok = await shareFile(paper.phone_file_path, isImage ? 'image/*' : 'application/pdf');
        if (ok) return;
      }
      // Nothing to share yet (e.g. demo rows): share the text we read.
      await Share.share({ message: paper.text || paper.file_name });
    } catch {
      /* user cancelled */
    }
  };

  const print = async () => {
    try {
      if (paper.phone_file_path && (await exists(paper.phone_file_path))) {
        await printFile(paper.phone_file_path);
      }
    } catch {
      /* user closed */
    }
  };

  const undo = async () => {
    await undelete('papers', paper.id);
    await refresh();
    success();
    nav.goBack();
  };

  const remove = async () => {
    await softDelete('papers', paper.id);
    await refresh();
    toast(t('toast.deleted'), {
      tone: 'danger',
      icon: 'trash-can-outline',
      undoLabel: t('common.undo'),
      durationMs: 10000,
      onUndo: undo,
    });
  };

  const setType = async (p: PaperType) => {
    await updateRow('papers', paper.id, { type: p });
    await refresh();
    await load();
    setEditing(false);
    success();
  };

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }}>
        {/* The document itself, on a white "paper" card. */}
        <Entry>
          <Card style={[styles.paper, { borderColor: 'rgba(15,23,42,0.08)' }]}>
            <Row style={{ gap: 12 }}>
              <View style={[styles.iconBox, { backgroundColor: color + '22' }]}>
                <Icon name={meta.icon} size={22} color={color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText size="body" weight="700" color="#0F172A" numberOfLines={1}>
                  {t(meta.i18nKey)}
                </AppText>
                <AppText size="small" color="#54627A" numberOfLines={2}>
                  {paper.file_name}
                </AppText>
              </View>
              {paper.amount != null ? <Tag label={formatTND(paper.amount)} tone="info" icon="cash" /> : null}
            </Row>

            <View style={styles.paperLine} />
            <AppText size="small" color="#334155" style={[styles.paperText, { fontFamily: MONO }]}>
              {paper.text || t('scan.wordsNotRead')}
            </AppText>
          </Card>
        </Entry>

        {/* Storage + reading badges */}
        <Row style={{ gap: 6, flexWrap: 'wrap', marginTop: theme.spacing.md }}>
          {paper.upload_status === 'backed_up' ? (
            <Tag label={t('papers.badgeBackedUp')} tone="ok" icon="cloud-check" />
          ) : (
            <Tag label={t('papers.badgeOnPhone')} tone="warn" icon="cellphone" />
          )}
          {paper.words_status === 'not_read' ? <Tag label={t('papers.badgeWordsNotRead')} icon="text-recognition" /> : null}
          <Tag label={t('papers.page', { n: paper.pages })} icon="file-multiple-outline" />
        </Row>

        {/* Preview (image or PDF) */}
        <Entry delay={70}>
          <Spacer size="lg" />
          {isImage ? (
            <Card>
              <Image source={{ uri: paper.phone_file_path }} style={styles.preview} resizeMode="contain" />
            </Card>
          ) : (
            <Card>
              <Row style={{ gap: 10 }}>
                <Icon name="file-pdf-box" size={30} color={theme.colors.late} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText size="body" weight="700">
                    PDF
                  </AppText>
                  <AppText size="small" muted numberOfLines={1}>
                    {paper.file_name}
                  </AppText>
                </View>
              </Row>
            </Card>
          )}
        </Entry>

        {/* Ref + details */}
        <Entry delay={120}>
          <Spacer size="lg" />
          <Group>
            <KV label={t('scan.type')} value={t(meta.i18nKey)} />
            <KV label={t('scan.date')} value={formatDate(paper.paper_date ?? paper.created_at)} />
            <KV label={t('scan.company')} value={paper.company_name ?? '—'} />
            <KV label={t('scan.device')} value={paper.device_label ?? '—'} />
            <KV label={t('scan.amount')} value={formatTND(paper.amount)} />
          </Group>
        </Entry>

        {/* Actions */}
        <Entry delay={170}>
          <Spacer size="lg" />
          <Row style={{ gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title={t('common.share')} icon="share-variant" variant="outline" onPress={share} block />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={t('common.print')} icon="printer-outline" variant="outline" onPress={print} block />
            </View>
          </Row>
          <Spacer size="sm" />
          <Button title={t('device.edit')} icon="pencil-outline" variant="brandSoft" onPress={() => setEditing(true)} block />
          <Spacer size="sm" />
          <Button title={t('common.delete')} icon="trash-can-outline" variant="danger" onPress={remove} block />
        </Entry>
      </ScrollView>

      {/* Edit type */}
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => setEditing(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
            <Display size="lg" weight="700">
              {t('scan.type')}
            </Display>
            <Spacer size="md" />
            <View style={styles.chips}>
              {PAPER_TYPES.map((p) => (
                <Chip
                  key={p}
                  label={t(PAPER_TYPE_META[p].i18nKey)}
                  icon={PAPER_TYPE_META[p].icon}
                  selected={paper.type === p}
                  onPress={() => setType(p)}
                />
              ))}
            </View>
            <Spacer size="lg" />
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setEditing(false)} block />
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  paper: { backgroundColor: '#FFFFFF' },
  paperLine: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(15,23,42,0.10)', marginVertical: 12 },
  paperText: { lineHeight: 22 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  preview: { width: '100%', height: 320, borderRadius: 12 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

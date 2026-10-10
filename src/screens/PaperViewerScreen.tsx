// One paper: what it is, where it is stored, the text we read, and actions (spec 5.4).
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Tag } from '@/components/StatusChip';
import { AppText, Badge, Button, Card, Divider, Icon, Row, Spacer } from '@/components/ui';
import type { PaperWithRefs } from '@/data/queries';
import { first, softDelete, undelete, updateRow } from '@/db/repo';
import { useDirection, useT } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { formatTND } from '@/lib/money';
import { PAPER_TYPE_META } from '@/lib/status';
import type { RootStackParamList } from '@/navigation/types';
import { success } from '@/services/feedback';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaperType } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'PaperViewer'>;

const PAPER_TYPES: PaperType[] = ['invoice', 'contract', 'quote', 'dispatch_note', 'reception_sheet', 'warranty', 'other'];

export function PaperViewerScreen() {
  const theme = useTheme();
  const { t } = useT();
  const dir = useDirection();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const refresh = useWork((s) => s.refresh);

  const [paper, setPaper] = useState<PaperWithRefs | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleted, setDeleted] = useState(false);

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
  const isImage = /\.(png|jpe?g|webp)$/i.test(paper.phone_file_path ?? '');

  const share = async () => {
    try {
      if (paper.phone_file_path && (await FileSystem.getInfoAsync(paper.phone_file_path)).exists) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(paper.phone_file_path, { mimeType: isImage ? 'image/*' : 'application/pdf' });
          return;
        }
      }
      // Nothing to share yet (e.g. demo rows): share the text we read.
      await Share.share({ message: paper.text || paper.file_name });
    } catch {
      /* user cancelled */
    }
  };

  const print = async () => {
    try {
      if (paper.phone_file_path && (await FileSystem.getInfoAsync(paper.phone_file_path)).exists) {
        await Print.printAsync({ uri: paper.phone_file_path });
      }
    } catch {
      /* user closed */
    }
  };

  const remove = async () => {
    await softDelete('papers', paper.id);
    await refresh();
    setDeleted(true);
    setTimeout(() => setDeleted((d) => d), 10000);
  };

  const undo = async () => {
    await undelete('papers', paper.id);
    await refresh();
    setDeleted(false);
    success();
    nav.goBack();
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
        <Card>
          <Row style={{ gap: 12 }}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.primarySoft }]}>
              <Icon name={meta.icon} size={28} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText size="section" weight="700">
                {t(meta.i18nKey)}
              </AppText>
              <AppText size="small" muted numberOfLines={2}>
                {paper.file_name}
              </AppText>
            </View>
          </Row>
          <Spacer size="md" />
          <Row style={{ gap: 8, flexWrap: 'wrap' }}>
            <Badge label={t('papers.badgeOnPhone')} color={theme.colors.info} icon="cellphone" />
            {paper.upload_status === 'backed_up' ? <Badge label={t('papers.badgeBackedUp')} color={theme.colors.done} icon="cloud-check" /> : null}
            {paper.words_status === 'not_read' ? <Badge label={t('papers.badgeWordsNotRead')} color={theme.colors.due} icon="text-recognition" /> : null}
            <Tag label={t('papers.page', { n: paper.pages })} icon="file-multiple-outline" color={theme.colors.textMuted} />
          </Row>
        </Card>

        {/* Preview */}
        <Spacer size="lg" />
        {isImage ? (
          <Card>
            <Image source={{ uri: paper.phone_file_path }} style={styles.preview} resizeMode="contain" />
          </Card>
        ) : (
          <Card>
            <Row style={{ gap: 10 }}>
              <Icon name="file-pdf-box" size={30} color={theme.colors.late} />
              <View style={{ flex: 1 }}>
                <AppText size="body" weight="600">
                  PDF
                </AppText>
                <AppText size="small" muted>
                  {paper.file_name}
                </AppText>
              </View>
            </Row>
          </Card>
        )}

        {/* Ref + details */}
        <Spacer size="lg" />
        <Card>
          <Detail label={t('scan.company')} value={paper.company_name ?? '—'} />
          <Divider />
          <Detail label={t('scan.device')} value={paper.device_label ?? '—'} />
          <Divider />
          <Detail label={t('scan.date')} value={formatDate(paper.paper_date ?? paper.created_at)} />
          <Divider />
          <Detail label={t('scan.amount')} value={formatTND(paper.amount)} />
        </Card>

        {/* Text we read */}
        {paper.text ? (
          <>
            <Spacer size="lg" />
            <AppText size="section" weight="700">
              {t('scan.suggested')}
            </AppText>
            <Spacer size="sm" />
            <Card>
              <AppText size="small" style={{ lineHeight: 22 }}>
                {paper.text}
              </AppText>
            </Card>
          </>
        ) : null}

        <Spacer size="xl" />
        <Button title={t('common.share')} icon="share-variant" variant="secondary" onPress={share} />
        <Spacer size="sm" />
        <Button title={t('common.print')} icon="printer-outline" variant="secondary" onPress={print} />
        <Spacer size="sm" />
        <Button title={t('device.edit')} icon="pencil-outline" variant="secondary" onPress={() => setEditing(true)} />
        <Spacer size="sm" />
        <Button title={t('common.delete')} icon="trash-can-outline" variant="danger" onPress={remove} />
      </ScrollView>

      {/* Edit type */}
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => setEditing(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.card }]}>
            <AppText size="section" weight="700">
              {t('scan.type')}
            </AppText>
            <Spacer size="md" />
            <View style={styles.chips}>
              {PAPER_TYPES.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setType(p)}
                  style={[
                    styles.chip,
                    {
                      borderColor: paper.type === p ? theme.colors.primary : theme.colors.border,
                      backgroundColor: paper.type === p ? theme.colors.primary : theme.colors.cardAlt,
                    },
                  ]}
                >
                  <Icon name={PAPER_TYPE_META[p].icon} size={16} color={paper.type === p ? theme.colors.onPrimary : theme.colors.text} />
                  <AppText size="small" weight="600" color={paper.type === p ? theme.colors.onPrimary : theme.colors.text}>
                    {t(PAPER_TYPE_META[p].i18nKey)}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <Spacer size="lg" />
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setEditing(false)} />
          </View>
        </Pressable>
      </Modal>

      {/* Delete with 10-second Undo */}
      {deleted ? (
        <View style={[styles.undo, { backgroundColor: theme.colors.text }]}>
          <AppText size="small" weight="600" color={theme.colors.bg}>
            {t('papers.deleted')}
          </AppText>
          <Button title={t('common.undo')} variant="secondary" onPress={undo} />
        </View>
      ) : null}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const dir = useDirection();
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 10, flexDirection: dir.row }}>
      <AppText size="small" muted>
        {label}
      </AppText>
      <AppText size="body" weight="600" style={{ flexShrink: 1, textAlign: dir.textAlign }}>
        {value}
      </AppText>
    </Row>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  preview: { width: '100%', height: 320, borderRadius: 12 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  undo: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});

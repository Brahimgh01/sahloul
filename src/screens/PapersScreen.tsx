// Papers: search inside the documents, filter by type, open a page (spec 5.4).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Badge, Button, Chip, EmptyState, Icon, IconButton, Row, Spacer } from '@/components/ui';
import type { PaperWithRefs } from '@/data/queries';
import { softDelete, undelete } from '@/db/repo';
import { useDirection, useT } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { formatTND } from '@/lib/money';
import { PAPER_TYPE_META } from '@/lib/status';
import type { RootStackParamList } from '@/navigation/types';
import { haptic, success } from '@/services/feedback';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaperType } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PAPER_TYPES: PaperType[] = ['invoice', 'contract', 'quote', 'dispatch_note', 'reception_sheet', 'warranty', 'other'];

export function PapersScreen() {
  const theme = useTheme();
  const { t } = useT();
  const dir = useDirection();
  const nav = useNavigation<Nav>();
  const papers = useWork((s) => s.papers);
  const refresh = useWork((s) => s.refresh);

  const [search, setSearch] = useState('');
  const [type, setType] = useState<PaperType | 'all'>('all');
  const [undoId, setUndoId] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return papers.filter((p) => {
      if (type !== 'all' && p.type !== type) return false;
      if (!q) return true;
      const hay = [p.text, p.file_name, p.device_label, p.company_name, p.type].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [papers, search, type]);

  const remove = async (p: PaperWithRefs) => {
    haptic('warning');
    await softDelete('papers', p.id);
    await refresh();
    setUndoId(p.id);
    setTimeout(() => setUndoId((cur) => (cur === p.id ? null : cur)), 10000);
  };

  const undo = async () => {
    if (!undoId) return;
    await undelete('papers', undoId);
    await refresh();
    setUndoId(null);
    success();
  };

  const renderItem = ({ item }: { item: PaperWithRefs }) => {
    const meta = PAPER_TYPE_META[item.type as PaperType] ?? PAPER_TYPE_META.other;
    return (
      <Pressable
        onPress={() => nav.navigate('PaperViewer', { paperId: item.id })}
        onLongPress={() => remove(item)}
        delayLongPress={400}
        style={{ marginBottom: theme.spacing.md }}
      >
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Row style={{ gap: 12 }}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.primarySoft }]}>
              <Icon name={meta.icon} size={24} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <AppText size="body" weight="600" numberOfLines={1}>
                {t(meta.i18nKey)}
              </AppText>
              <AppText size="small" muted numberOfLines={1}>
                {item.file_name}
              </AppText>
              {item.device_label || item.company_name ? (
                <AppText size="tiny" muted numberOfLines={1}>
                  {[item.device_label, item.company_name].filter(Boolean).join(' · ')}
                </AppText>
              ) : null}
              <Row style={{ gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                <Badge label={t('papers.badgeOnPhone')} color={theme.colors.info} icon="cellphone" />
                {item.upload_status === 'backed_up' ? <Badge label={t('papers.badgeBackedUp')} color={theme.colors.done} icon="cloud-check" /> : null}
                {item.words_status === 'not_read' ? <Badge label={t('papers.badgeWordsNotRead')} color={theme.colors.due} icon="text-recognition" /> : null}
              </Row>
            </View>
            <View style={{ alignItems: dir.isRTL ? 'flex-start' : 'flex-end', gap: 6 }}>
              {item.amount != null ? (
                <AppText size="small" weight="700">
                  {formatTND(item.amount)}
                </AppText>
              ) : null}
              <AppText size="tiny" muted>
                {formatDate(item.paper_date ?? item.created_at)}
              </AppText>
            </View>
          </Row>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen>
      <View style={{ padding: theme.spacing.lg, paddingBottom: 0 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <AppText size="title" weight="700">
            {t('papers.title')}
          </AppText>
          <IconButton name="line-scan" label={t('scan.cta')} onPress={() => nav.navigate('Scan')} />
        </Row>

        <Spacer size="md" />
        <View style={[styles.search, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border, flexDirection: dir.row }]}>
          <Icon name="magnify" size={22} color={theme.colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('papers.searchInside')}
            placeholderTextColor={theme.colors.textFaint}
            style={[styles.input, { color: theme.colors.text, textAlign: dir.textAlign }]}
            accessibilityLabel={t('common.search')}
          />
        </View>

        <Spacer size="md" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label={t('common.all')} selected={type === 'all'} onPress={() => setType('all')} />
          {PAPER_TYPES.map((p) => (
            <Chip
              key={p}
              label={t(PAPER_TYPE_META[p].i18nKey)}
              icon={PAPER_TYPE_META[p].icon}
              selected={type === p}
              onPress={() => setType(p)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 180 }}
        ListEmptyComponent={
          <EmptyState
            icon="file-document-multiple-outline"
            title={t('papers.none')}
            body={t('papers.noneBody')}
            actionLabel={t('scan.cta')}
            onAction={() => nav.navigate('Scan')}
          />
        }
      />

      {undoId ? (
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

const styles = StyleSheet.create({
  search: { minHeight: 52, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, alignItems: 'center', gap: 12 },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  undo: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 100,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});

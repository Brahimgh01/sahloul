// Papers: search inside the documents, filter by type, open a page (spec 5.4).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { Entry, PressScale } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { AppText, Card, Chip, Display, EmptyState, Icon, IconButton, Row, SearchBar, Spacer, Tag } from '@/components/ui';
import type { PaperWithRefs } from '@/data/queries';
import { softDelete, undelete } from '@/db/repo';
import { useT } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { formatTND } from '@/lib/money';
import { PAPER_TYPE_META } from '@/lib/status';
import type { RootStackParamList } from '@/navigation/types';
import { haptic, success } from '@/services/feedback';
import { toast } from '@/store/feedback';
import { useWork } from '@/store/work';
import type { Palette } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaperType } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PAPER_TYPES: PaperType[] = ['invoice', 'contract', 'quote', 'dispatch_note', 'reception_sheet', 'warranty', 'other'];

function typeColor(colors: Palette, type: PaperType): string {
  if (type === 'invoice') return colors.info;
  if (type === 'contract') return colors.brand;
  return colors.textMuted;
}

export function PapersScreen() {
  const theme = useTheme();
  const { t } = useT();
  const nav = useNavigation<Nav>();
  const papers = useWork((s) => s.papers);
  const refresh = useWork((s) => s.refresh);

  const [search, setSearch] = useState('');
  const [type, setType] = useState<PaperType | 'all'>('all');

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
    toast(t('toast.deleted'), {
      tone: 'danger',
      icon: 'trash-can-outline',
      undoLabel: t('common.undo'),
      durationMs: 10000,
      onUndo: async () => {
        await undelete('papers', p.id);
        await refresh();
        success();
      },
    });
  };

  const renderItem = ({ item, index }: { item: PaperWithRefs; index: number }) => {
    const meta = PAPER_TYPE_META[item.type as PaperType] ?? PAPER_TYPE_META.other;
    const color = typeColor(theme.colors, item.type as PaperType);
    return (
      <Entry delay={Math.min(index * 40, 240)}>
        <PressScale
          onPress={() => nav.navigate('PaperViewer', { paperId: item.id })}
          onLongPress={() => remove(item)}
          delayLongPress={400}
          accessibilityRole="button"
          accessibilityLabel={t(meta.i18nKey)}
          style={{ marginBottom: theme.spacing.md }}
        >
          <Card>
            <Row style={{ gap: 12 }}>
              <View style={[styles.iconBox, { backgroundColor: color + '22' }]}>
                <Icon name={meta.icon} size={24} color={color} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Row style={{ gap: 8 }}>
                  <AppText size="body" weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {t(meta.i18nKey)}
                  </AppText>
                  {item.amount != null ? <Tag label={formatTND(item.amount)} tone="info" icon="cash" /> : null}
                </Row>
                <AppText size="small" muted numberOfLines={1}>
                  {item.file_name}
                </AppText>
              </View>
            </Row>

            <Row style={{ gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {item.device_label ? <Tag label={item.device_label} icon="devices" /> : null}
              {item.company_name ? <Tag label={item.company_name} icon="office-building" /> : null}
              <Tag label={formatDate(item.paper_date ?? item.created_at)} icon="calendar-blank-outline" />
              {item.upload_status === 'backed_up' ? (
                <Tag label={t('papers.badgeBackedUp')} tone="ok" icon="cloud-check" />
              ) : (
                <Tag label={t('papers.badgeOnPhone')} tone="warn" icon="cellphone" />
              )}
              {item.words_status === 'not_read' ? <Tag label={t('papers.badgeWordsNotRead')} icon="text-recognition" /> : null}
            </Row>
          </Card>
        </PressScale>
      </Entry>
    );
  };

  return (
    <Screen>
      <View style={{ padding: theme.spacing.lg, paddingBottom: 0 }}>
        <Entry>
          <Row style={{ justifyContent: 'space-between' }}>
            <Display size="title" weight="700">
              {t('papers.title')}
            </Display>
            <IconButton name="line-scan" label={t('scan.cta')} onPress={() => nav.navigate('Scan')} />
          </Row>

          <Spacer size="md" />
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={t('papers.searchInside')}
            accessibilityLabel={t('common.search')}
          />

          <Spacer size="md" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip size="sm" label={t('common.all')} selected={type === 'all'} onPress={() => setType('all')} />
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
          </ScrollView>
        </Entry>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

// Companies: cards with devices held, late count and contract chip (spec 5.6).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Tag } from '@/components/StatusChip';
import { AppText, Card, EmptyState, Icon, Row, Spacer } from '@/components/ui';
import { useDirection, useT } from '@/i18n';
import { formatDate } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CompaniesScreen() {
  const theme = useTheme();
  const { t } = useT();
  const dir = useDirection();
  const nav = useNavigation<Nav>();
  const companies = useWork((s) => s.companies);

  return (
    <Screen>
      <View style={{ padding: theme.spacing.lg, paddingBottom: 0 }}>
        <AppText size="title" weight="700">
          {t('companies.title')}
        </AppText>
      </View>

      <FlatList
        data={companies}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }}
        ListEmptyComponent={<EmptyState icon="factory" title={t('companies.none')} body={t('companies.noneBody')} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => nav.navigate('Company', { id: item.id })} style={{ marginBottom: theme.spacing.md }}>
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ gap: 10, flex: 1 }}>
                  <View style={[styles.iconBox, { backgroundColor: theme.colors.primarySoft }]}>
                    <Icon name="factory" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText size="body" weight="700" numberOfLines={1}>
                      {item.name}
                    </AppText>
                    <AppText size="small" muted numberOfLines={1}>
                      {item.contact_person}
                    </AppText>
                  </View>
                </Row>
                <Icon name="chevron-right" size={24} color={theme.colors.textMuted} />
              </Row>

              <Spacer size="md" />
              <Row style={{ gap: 8, flexWrap: 'wrap' }}>
                <Tag label={`${t('companies.devicesHeld')}: ${item.held_now}`} icon="package-variant" color={theme.colors.info} />
                {item.late_count > 0 ? (
                  <Tag label={t('companies.lateCount', { count: item.late_count })} icon="alert-circle" color={theme.colors.late} />
                ) : null}
                {item.contract?.ending_soon ? (
                  <Tag label={t('companies.contractEndingSoon')} icon="file-alert" color={theme.colors.due} />
                ) : null}
                {item.contract ? (
                  <Tag label={t('companies.deadlineDays', { count: item.contract.deadline_days })} icon="calendar-clock" color={theme.colors.textMuted} />
                ) : null}
              </Row>
              {item.contract?.ending_soon ? (
                <>
                  <Spacer size="sm" />
                  <AppText size="tiny" color={theme.colors.due}>
                    {t('companies.contractEndsOn', { date: formatDate(item.contract.end_date) })}
                  </AppText>
                </>
              ) : null}
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

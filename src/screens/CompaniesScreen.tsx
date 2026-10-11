// Companies: cards with devices held, late count and contract tags (spec 5.6).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, View } from 'react-native';

import { AppBar } from '@/components/AppBar';
import { Gradient } from '@/components/Gradient';
import { Entry, PressScale } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { AppText, Card, Display, EmptyState, Icon, Row, Spacer, Tag } from '@/components/ui';
import { useT } from '@/i18n';
import { formatDate } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';
import { useWork } from '@/store/work';
import { gradients } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CompaniesScreen() {
  const theme = useTheme();
  const { t } = useT();
  const nav = useNavigation<Nav>();
  const companies = useWork((s) => s.companies);

  return (
    <Screen edges={[]}>
      <AppBar title={t('companies.title')} />

      <FlatList
        data={companies}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }}
        ListEmptyComponent={<EmptyState icon="office-building" title={t('companies.none')} body={t('companies.noneBody')} />}
        renderItem={({ item, index }) => (
          <Entry delay={Math.min(index, 8) * 40} style={{ marginBottom: theme.spacing.md }}>
            <PressScale
              accessibilityRole="button"
              accessibilityLabel={item.name}
              onPress={() => nav.navigate('Company', { id: item.id })}
            >
              <Card>
                <Row style={{ gap: 12 }}>
                  <Gradient colors={gradients.brand} radius={16} style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="office-building" size={26} color="#FFFFFF" />
                  </Gradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Display size="lg" weight="700" numberOfLines={1}>
                      {item.name}
                    </Display>
                    <AppText size="small" muted numberOfLines={1}>
                      {item.contact_person}
                    </AppText>
                  </View>
                  {item.contract?.ending_soon ? (
                    <Tag label={t('companies.contractEndingSoon')} tone="warn" icon="file-alert" />
                  ) : null}
                </Row>

                <Spacer size="md" />
                <Row style={{ gap: 8, flexWrap: 'wrap' }}>
                  <Tag label={`${t('companies.devicesHeld')}: ${item.held_now}`} tone="info" icon="package-variant" />
                  {item.late_count > 0 ? (
                    <Tag label={t('companies.lateCount', { count: item.late_count })} tone="late" icon="alert-circle" />
                  ) : (
                    <Tag label={t('companies.onTime')} tone="ok" icon="check-circle-outline" />
                  )}
                  {item.contract ? (
                    <Tag label={t('companies.deadlineDays', { count: item.contract.deadline_days })} icon="calendar-clock" />
                  ) : null}
                </Row>
                {item.contract?.ending_soon ? (
                  <>
                    <Spacer size="sm" />
                    <AppText size="tiny" color={theme.colors.warn} weight="600">
                      {t('companies.contractEndsOn', { date: formatDate(item.contract.end_date) })}
                    </AppText>
                  </>
                ) : null}
              </Card>
            </PressScale>
          </Entry>
        )}
      />
    </Screen>
  );
}

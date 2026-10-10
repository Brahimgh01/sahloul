// Company page: contact, contracts, devices held, history, papers (spec 5.6).
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ResultChip, Tag } from '@/components/StatusChip';
import { AppText, Button, Card, Divider, EmptyState, Icon, Row, Spacer } from '@/components/ui';
import { getCompany, getCompanyTrips, listPapers, type CompanyWithStats, type PaperWithRefs } from '@/data/queries';
import { useDirection, useT } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { PAPER_TYPE_META } from '@/lib/status';
import { formatTND } from '@/lib/money';
import type { RootStackParamList } from '@/navigation/types';
import { success } from '@/services/feedback';
import { openReminder, whatsappUrl } from '@/services/reminders';
import { useSettings } from '@/store/settings';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaperType, Trip } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Company'>;

export function CompanyScreen() {
  const theme = useTheme();
  const { t } = useT();
  const dir = useDirection();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const language = useSettings((s) => s.language);
  const devices = useWork((s) => s.devices);

  const [company, setCompany] = useState<CompanyWithStats | null>(null);
  const [trips, setTrips] = useState<(Trip & { inventory_no: string; device_name: string })[]>([]);
  const [papers, setPapers] = useState<PaperWithRefs[]>([]);

  useEffect(() => {
    (async () => {
      const [c, tr, pp] = await Promise.all([getCompany(params.id), getCompanyTrips(params.id), listPapers({ companyId: params.id })]);
      setCompany(c);
      setTrips(tr);
      setPapers(pp);
    })();
  }, [params.id]);

  if (!company) {
    return (
      <Screen edges={[]}>
        <View style={{ padding: theme.spacing.lg }}>
          <AppText muted>{t('common.loading')}</AppText>
        </View>
      </Screen>
    );
  }

  const held = devices.filter((d) => d.status === 'at_company' && d.trip_company_id === company.id);
  const late = held.filter((d) => d.is_late);

  const remind = async () => {
    if (late.length === 0) return;
    const ok = await openReminder(
      company,
      late.map((d) => ({ inventory_no: d.inventory_no, type: d.type, days_late: d.days_late })),
      language,
    );
    if (ok) success();
  };

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }}>
        <Card>
          <AppText size="title" weight="700">
            {company.name}
          </AppText>
          {company.contact_person ? (
            <AppText size="small" muted>
              {company.contact_person}
            </AppText>
          ) : null}
          <Spacer size="md" />
          <Row style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button title={t('common.call')} icon="phone" variant="secondary" onPress={() => company.phone && Linking.openURL(`tel:${company.phone.replace(/\s/g, '')}`)} />
            <Button
              title={t('common.whatsapp')}
              icon="whatsapp"
              variant="secondary"
              onPress={() => {
                const wa = whatsappUrl(company, `${t('reminder.greeting')} ${company.name},`);
                if (wa) Linking.openURL(wa);
              }}
            />
            <Button title={t('common.email')} icon="email-outline" variant="secondary" onPress={() => company.email && Linking.openURL(`mailto:${company.email}`)} />
          </Row>
        </Card>

        {/* Contracts */}
        <Spacer size="lg" />
        <AppText size="section" weight="700">
          {t('companies.contracts')}
        </AppText>
        <Spacer size="sm" />
        {company.contract ? (
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <AppText size="body" weight="600">
                {company.contract.reference || t('companies.contracts')}
              </AppText>
              {company.contract.ending_soon ? <Tag label={t('companies.contractEndingSoon')} icon="file-alert" color={theme.colors.due} /> : null}
            </Row>
            <Spacer size="sm" />
            <AppText size="small" muted>
              {formatDate(company.contract.start_date)} → {formatDate(company.contract.end_date)}
            </AppText>
            <Spacer size="sm" />
            <Row style={{ gap: 8, flexWrap: 'wrap' }}>
              <Tag label={t('companies.deadlineDays', { count: company.contract.deadline_days })} icon="calendar-clock" color={theme.colors.textMuted} />
              <Tag label={`${t('companies.coveredTypes')}: ${company.contract.covered_device_types.join(', ')}`} icon="devices" color={theme.colors.textMuted} />
            </Row>
          </Card>
        ) : (
          <AppText size="small" muted>
            {t('common.none')}
          </AppText>
        )}

        {/* Devices held now */}
        <Spacer size="lg" />
        <Row style={{ justifyContent: 'space-between' }}>
          <AppText size="section" weight="700">
            {t('companies.devicesHeldNow')}
          </AppText>
          {late.length > 0 ? (
            <Button title={t('companies.reminder')} icon="bell-ring-outline" onPress={remind} style={{ minWidth: 0 }} />
          ) : null}
        </Row>
        <Spacer size="sm" />
        {held.length === 0 ? (
          <AppText size="small" muted>
            {t('common.none')}
          </AppText>
        ) : (
          held.map((d) => (
            <Card key={d.id} style={{ marginBottom: theme.spacing.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <AppText size="body" weight="600">
                    {d.type} · {d.inventory_no}
                  </AppText>
                  <AppText size="small" muted>
                    {d.department} · {t('device.expectedOn', { date: formatDate(d.expected_return_date) })}
                  </AppText>
                </View>
                {d.is_late ? <Tag label={t('today.daysLate', { count: d.days_late })} icon="alert-circle" color={theme.colors.late} /> : null}
              </Row>
            </Card>
          ))
        )}

        {/* History */}
        <Spacer size="lg" />
        <AppText size="section" weight="700">
          {t('companies.history')}
        </AppText>
        <Spacer size="sm" />
        {trips.length === 0 ? (
          <AppText size="small" muted>
            {t('common.none')}
          </AppText>
        ) : (
          trips.map((tr) => (
            <Card key={tr.id} style={{ marginBottom: theme.spacing.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <AppText size="body" weight="600">
                  {tr.inventory_no} · {tr.device_name}
                </AppText>
                {tr.result ? <ResultChip result={tr.result} /> : null}
              </Row>
              <Spacer size="xs" />
              <AppText size="small" muted>
                {formatDate(tr.sent_date)} → {tr.returned_date ? formatDate(tr.returned_date) : formatDate(tr.expected_return_date)}
              </AppText>
              {tr.cost != null ? (
                <AppText size="small" weight="600" style={{ marginTop: 4 }}>
                  {formatTND(tr.cost)}
                </AppText>
              ) : null}
            </Card>
          ))
        )}

        {/* Papers */}
        <Spacer size="lg" />
        <AppText size="section" weight="700">
          {t('companies.papers')}
        </AppText>
        <Spacer size="sm" />
        {papers.map((p) => (
          <Card key={p.id} style={{ marginBottom: theme.spacing.sm }}>
            <Row style={{ gap: 10 }}>
              <Icon name={PAPER_TYPE_META[p.type as PaperType].icon} size={22} color={theme.colors.primary} />
              <AppText size="body" weight="600" style={{ flex: 1 }} numberOfLines={1}>
                {t(PAPER_TYPE_META[p.type as PaperType].i18nKey)} · {p.file_name}
              </AppText>
            </Row>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({});

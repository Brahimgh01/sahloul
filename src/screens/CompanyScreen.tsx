// Company page: contact, contract, devices held, history, papers (spec 5.6).
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { DeviceCard } from '@/components/DeviceCard';
import { Gradient } from '@/components/Gradient';
import { Entry, PressScale } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { ResultChip } from '@/components/StatusChip';
import {
  AppText,
  Button,
  Card,
  Display,
  EmptyState,
  Group,
  GroupHeading,
  Icon,
  type IconName,
  KV,
  Row,
  SectionTitle,
  Spacer,
  Stat,
  StatGrid,
  Tag,
} from '@/components/ui';
import { getCompany, getCompanyTrips, listPapers, type CompanyWithStats, type PaperWithRefs } from '@/data/queries';
import { useT } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { PAPER_TYPE_META } from '@/lib/status';
import { formatTND } from '@/lib/money';
import type { RootStackParamList } from '@/navigation/types';
import { success } from '@/services/feedback';
import { openReminder, whatsappUrl } from '@/services/reminders';
import { useSettings } from '@/store/settings';
import { useWork } from '@/store/work';
import { gradients } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaperType, Trip } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Company'>;

/** A translucent labelled button used inside the gradient hero. */
function HeroAction({ icon, label, onPress }: { icon: IconName; label: string; onPress?: () => void }) {
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ flex: 1 }}>
      <View style={styles.heroBtn}>
        <Icon name={icon} size={18} color="#FFFFFF" />
        <AppText size="body" weight="700" color="#FFFFFF" numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </PressScale>
  );
}

/** A square translucent icon button used inside the gradient hero. */
function HeroIconAction({ icon, label, onPress }: { icon: IconName; label: string; onPress?: () => void }) {
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ minWidth: 48, minHeight: 48 }}>
      <View style={styles.heroIconBtn}>
        <Icon name={icon} size={20} color="#FFFFFF" />
      </View>
    </PressScale>
  );
}

export function CompanyScreen() {
  const theme = useTheme();
  const { t } = useT();
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
  const onTimePct = held.length ? Math.round((1 - late.length / Math.max(1, held.length)) * 100) : 100;

  const callCompany = () => company.phone && Linking.openURL(`tel:${company.phone.replace(/\s/g, '')}`);
  const waCompany = () => {
    const wa = whatsappUrl(company, `${t('reminder.greeting')} ${company.name},`);
    if (wa) Linking.openURL(wa);
  };
  const emailCompany = () => company.email && Linking.openURL(`mailto:${company.email}`);

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
        {/* Hero */}
        <Entry>
          <Gradient colors={gradients.brand} radius={theme.radius.xl} style={styles.hero}>
            <Row style={{ gap: 12, alignItems: 'flex-start' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Display size="title" weight="800" color="#FFFFFF" numberOfLines={2}>
                  {company.name}
                </Display>
                {company.contact_person ? (
                  <AppText size="small" weight="600" color="rgba(255,255,255,0.92)" numberOfLines={1}>
                    {company.contact_person}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.heroRib}>
                <Icon name="office-building" size={26} color="#FFFFFF" />
              </View>
            </Row>

            <Spacer size="md" />
            <Row style={{ gap: 8 }}>
              <HeroAction icon="phone" label={t('common.call')} onPress={callCompany} />
              <HeroAction icon="whatsapp" label={t('common.whatsapp')} onPress={waCompany} />
              <HeroIconAction icon="email-outline" label={t('common.email')} onPress={emailCompany} />
            </Row>
          </Gradient>
        </Entry>

        {/* Quick stats */}
        <Entry delay={60} style={{ marginTop: theme.spacing.lg }}>
          <StatGrid>
            <Stat value={held.length} label={t('companies.devicesHeldNow')} />
            <Stat value={late.length} label={t('today.late')} color={theme.colors.late} />
            <Stat value={`${onTimePct}%`} label={t('companies.onTime')} color={theme.colors.success} />
          </StatGrid>
        </Entry>

        {/* Contract */}
        <GroupHeading>{t('companies.contracts')}</GroupHeading>
        {company.contract ? (
          <Group>
            <KV label={t('companies.contracts')} value={company.contract.reference || t('common.none')} />
            <KV
              label={t('companies.deadlineDays', { count: company.contract.deadline_days })}
              value={`${company.contract.deadline_days} ${t('common.days')}`}
            />
            <KV label={t('companies.contractEndsOn', { date: formatDate(company.contract.end_date) })}>
              {company.contract.ending_soon ? (
                <Tag label={t('companies.contractEndingSoon')} tone="warn" icon="file-alert" />
              ) : (
                <Icon name="calendar-check-outline" size={20} color={theme.colors.success} />
              )}
            </KV>
            <KV label={t('companies.coveredTypes')} value={company.contract.covered_device_types.join(', ')} />
          </Group>
        ) : (
          <AppText size="small" muted>
            {t('common.none')}
          </AppText>
        )}

        {/* Devices held now */}
        <SectionTitle title={t('companies.devicesHeldNow')} count={held.length} />
        {held.length === 0 ? (
          <EmptyState icon="check-circle-outline" title={t('today.emptyLateTitle')} body={t('today.emptyLateBody')} />
        ) : (
          held.map((d, i) => (
            <Entry key={d.id} delay={Math.min(i, 8) * 40} style={{ marginBottom: theme.spacing.md }}>
              <DeviceCard device={d} showCompany={false} onPress={() => nav.navigate('Device', { id: d.id })} />
            </Entry>
          ))
        )}

        {/* History */}
        <SectionTitle title={t('companies.history')} count={trips.length} />
        {trips.length === 0 ? (
          <AppText size="small" muted>
            {t('common.none')}
          </AppText>
        ) : (
          trips.map((tr, i) => (
            <Entry key={tr.id} delay={Math.min(i, 8) * 40} style={{ marginBottom: theme.spacing.sm }}>
              <Card>
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
            </Entry>
          ))
        )}

        {/* Papers */}
        <SectionTitle title={t('companies.papers')} count={papers.length} />
        {papers.map((p, i) => (
          <Entry key={p.id} delay={Math.min(i, 8) * 40} style={{ marginBottom: theme.spacing.sm }}>
            <Card>
              <Row style={{ gap: 10 }}>
                <Icon name={PAPER_TYPE_META[p.type as PaperType].icon} size={22} color={theme.colors.brand} />
                <AppText size="body" weight="600" style={{ flex: 1 }} numberOfLines={1}>
                  {t(PAPER_TYPE_META[p.type as PaperType].i18nKey)} · {p.file_name}
                </AppText>
              </Row>
            </Card>
          </Entry>
        ))}

        <Spacer size="lg" />
        <Button
          title={t('companies.reminder')}
          icon="bell-ring-outline"
          variant="brandSoft"
          block
          disabled={late.length === 0}
          onPress={remind}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 18 },
  heroRib: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBtn: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  heroIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Devices: search (type / speak / scan), filters, and the list (spec 5.2).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BarcodeScanner } from '@/components/BarcodeScanner';
import { DeviceCard } from '@/components/DeviceCard';
import { Screen } from '@/components/Screen';
import { AppText, Button, Chip, EmptyState, Icon, IconButton, Row, Spacer } from '@/components/ui';
import { applyFilters, type DeviceFilters, type DeviceWithTrip } from '@/data/queries';
import { useDirection, useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { haptic, success } from '@/services/feedback';
import { useLiveSpeech, startListening, stopListening } from '@/services/speech';
import { useSettings } from '@/store/settings';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';
import type { DeviceStatus } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUSES: (DeviceStatus | 'all')[] = ['all', 'in_office', 'at_company', 'ready_for_pickup', 'back_in_service', 'retired'];

export function DevicesScreen() {
  const theme = useTheme();
  const { t } = useT();
  const dir = useDirection();
  const nav = useNavigation<Nav>();
  const devices = useWork((s) => s.devices);
  const companies = useWork((s) => s.companies);
  const language = useSettings((s) => s.language);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<DeviceFilters>({ status: 'all', department: 'all', company: 'all', criticalOnly: false });
  const [showFilters, setShowFilters] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [listening, setListening] = useState(false);

  useLiveSpeech((text, final) => {
    if (text) setSearch(text);
    if (final) setListening(false);
  });

  const departments = useMemo(
    () => Array.from(new Set(devices.map((d) => d.department).filter(Boolean))).sort(),
    [devices],
  );

  const results = useMemo(() => applyFilters(devices, { ...filters, search }), [devices, filters, search]);

  const activeFilters =
    (filters.status && filters.status !== 'all' ? 1 : 0) +
    (filters.department && filters.department !== 'all' ? 1 : 0) +
    (filters.company && filters.company !== 'all' ? 1 : 0) +
    (filters.criticalOnly ? 1 : 0);

  const toggleSpeak = async () => {
    if (listening) {
      stopListening();
      setListening(false);
      return;
    }
    haptic('select');
    setListening(true);
    const ok = await startListening(language, (txt) => setSearch(txt));
    if (!ok) setListening(false);
  };

  const renderItem = ({ item }: { item: DeviceWithTrip }) => (
    <DeviceCard
      device={item}
      onPress={() => nav.navigate('Device', { id: item.id })}
      onLongPress={() => nav.navigate('Device', { id: item.id })}
    />
  );

  return (
    <Screen>
      <View style={{ padding: theme.spacing.lg, paddingBottom: 0 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <AppText size="title" weight="700">
            {t('devices.title')}
          </AppText>
          <IconButton name="tray-arrow-down" label={t('devices.import')} onPress={() => nav.navigate('ImportCsv')} />
        </Row>

        <Spacer size="md" />
        <View
          style={[
            styles.search,
            { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border, flexDirection: dir.row },
          ]}
        >
          <Icon name="magnify" size={22} color={theme.colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('devices.searchPlaceholder')}
            placeholderTextColor={theme.colors.textFaint}
            style={[styles.input, { color: theme.colors.text, textAlign: dir.textAlign }]}
            accessibilityLabel={t('common.search')}
          />
          <Pressable onPress={toggleSpeak} hitSlop={8} accessibilityLabel={t('devices.speakSearch')}>
            <Icon name={listening ? 'microphone' : 'microphone-outline'} size={22} color={listening ? theme.colors.primary : theme.colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => setScanning(true)} hitSlop={8} accessibilityLabel={t('devices.scanBarcode')}>
            <Icon name="barcode-scan" size={22} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <Spacer size="md" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip
            label={t('devices.criticalOnly')}
            icon="alert-circle-outline"
            selected={!!filters.criticalOnly}
            color={theme.colors.critical}
            onPress={() => setFilters((f) => ({ ...f, criticalOnly: !f.criticalOnly }))}
          />
          <Chip
            label={t('devices.filterStatus')}
            icon="progress-wrench"
            selected={(filters.status ?? 'all') !== 'all'}
            onPress={() => setShowFilters(true)}
          />
          <Chip
            label={t('devices.filterDepartment')}
            icon="hospital-building"
            selected={(filters.department ?? 'all') !== 'all'}
            onPress={() => setShowFilters(true)}
          />
          {activeFilters > 0 ? (
            <Chip
              label={t('devices.clearFilters')}
              icon="filter-off-outline"
              onPress={() => setFilters({ status: 'all', department: 'all', company: 'all', criticalOnly: false })}
            />
          ) : null}
        </ScrollView>

        <Spacer size="sm" />
        <AppText size="small" muted>
          {t('devices.results', { count: results.length })}
        </AppText>
      </View>

      <FlatList
        data={results}
        keyExtractor={(d) => d.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }}
        ListEmptyComponent={
          <EmptyState
            icon={devices.length === 0 ? 'devices' : 'magnify-close'}
            title={t(devices.length === 0 ? 'devices.noDevices' : 'devices.noResults')}
            body={t(devices.length === 0 ? 'devices.noDevicesBody' : 'devices.noResultsBody')}
            actionLabel={devices.length === 0 ? t('devices.import') : undefined}
            onAction={devices.length === 0 ? () => nav.navigate('ImportCsv') : undefined}
          />
        }
      />

      <BarcodeScanner
        visible={scanning}
        onClose={() => setScanning(false)}
        onScan={(value) => {
          setSearch(value);
          setScanning(false);
          success();
        }}
      />

      {/* Filter sheet */}
      <Modal visible={showFilters} transparent animationType="fade" onRequestClose={() => setShowFilters(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => setShowFilters(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.card }]}>
            <AppText size="section" weight="700">
              {t('devices.filters')}
            </AppText>
            <Spacer size="md" />

            <AppText size="small" muted>
              {t('devices.filterStatus')}
            </AppText>
            <Spacer size="sm" />
            <View style={styles.chips}>
              {STATUSES.map((s) => (
                <Chip
                  key={s}
                  label={s === 'all' ? t('common.all') : t(`statuses.${s}`)}
                  selected={(filters.status ?? 'all') === s}
                  onPress={() => setFilters((f) => ({ ...f, status: s }))}
                />
              ))}
            </View>

            <Spacer size="md" />
            <AppText size="small" muted>
              {t('devices.filterDepartment')}
            </AppText>
            <Spacer size="sm" />
            <View style={styles.chips}>
              <Chip label={t('common.all')} selected={(filters.department ?? 'all') === 'all'} onPress={() => setFilters((f) => ({ ...f, department: 'all' }))} />
              {departments.map((d) => (
                <Chip key={d} label={d} selected={filters.department === d} onPress={() => setFilters((f) => ({ ...f, department: d }))} />
              ))}
            </View>

            <Spacer size="md" />
            <AppText size="small" muted>
              {t('devices.filterCompany')}
            </AppText>
            <Spacer size="sm" />
            <View style={styles.chips}>
              <Chip label={t('common.all')} selected={(filters.company ?? 'all') === 'all'} onPress={() => setFilters((f) => ({ ...f, company: 'all' }))} />
              {companies.map((c) => (
                <Chip key={c.id} label={c.name} selected={filters.company === c.id} onPress={() => setFilters((f) => ({ ...f, company: c.id }))} />
              ))}
            </View>

            <Spacer size="lg" />
            <Button title={t('common.done')} onPress={() => setShowFilters(false)} />
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 12,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
});

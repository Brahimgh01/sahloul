// Devices: search (type / speak / scan), filter rail, and the list (spec 5.2).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppBar } from '@/components/AppBar';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { DeviceCard } from '@/components/DeviceCard';
import { Entry } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { AppText, Button, Chip, Display, EmptyState, IconButton, SearchBar, Spacer } from '@/components/ui';
import { applyFilters, type DeviceFilters, type DeviceWithTrip } from '@/data/queries';
import { useT } from '@/i18n';
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

  const clearFilters = () => setFilters({ status: 'all', department: 'all', company: 'all', criticalOnly: false });

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

  const renderItem = ({ item, index }: { item: DeviceWithTrip; index: number }) => (
    <Entry delay={Math.min(index, 8) * 35} style={{ marginBottom: theme.spacing.md }}>
      <DeviceCard
        device={item}
        onPress={() => nav.navigate('Device', { id: item.id })}
        onLongPress={() => nav.navigate('Device', { id: item.id })}
      />
    </Entry>
  );

  return (
    <Screen edges={[]}>
      <AppBar
        title={t('devices.title')}
        right={<IconButton name="tray-arrow-down" label={t('devices.import')} onPress={() => nav.navigate('ImportCsv')} />}
      />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md }}>
        <Entry>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t('devices.searchPlaceholder')}>
            <IconButton
              name={listening ? 'microphone' : 'microphone-outline'}
              label={t('devices.speakSearch')}
              onPress={toggleSpeak}
              color={listening ? theme.colors.brand : theme.colors.textMuted}
            />
            <IconButton name="barcode-scan" label={t('devices.scanBarcode')} onPress={() => setScanning(true)} color={theme.colors.textMuted} />
          </SearchBar>
        </Entry>

        <Spacer size="md" />
        <Entry delay={40}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            <Chip
              label={t('devices.criticalOnly')}
              icon="alert-circle-outline"
              tone="crit"
              selected={!!filters.criticalOnly}
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
            <Chip
              label={t('devices.filterCompany')}
              icon="office-building"
              selected={(filters.company ?? 'all') !== 'all'}
              onPress={() => setShowFilters(true)}
            />
            {activeFilters > 0 ? (
              <Chip label={t('devices.clearFilters')} icon="filter-off-outline" onPress={clearFilters} />
            ) : null}
          </ScrollView>
        </Entry>

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
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
            <Display size="lg" weight="700">
              {t('devices.filters')}
            </Display>
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
  rail: { gap: 8, paddingRight: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '85%' },
});

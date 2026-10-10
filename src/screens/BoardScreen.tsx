// Board view: a simple kanban of devices by status (spec 5.1 "Vue tableau").
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Card, Icon, Row, Spacer } from '@/components/ui';
import type { DeviceWithTrip } from '@/data/queries';
import { useDirection, useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';
import type { Palette } from '@/theme/tokens';
import type { DeviceStatus } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Column {
  status: DeviceStatus;
  key: string;
  colorKey: keyof Palette;
}

const COLUMNS: Column[] = [
  { status: 'in_office', key: 'board.inOffice', colorKey: 'info' },
  { status: 'at_company', key: 'board.atCompany', colorKey: 'due' },
  { status: 'ready_for_pickup', key: 'board.ready', colorKey: 'primary' },
  { status: 'back_in_service', key: 'board.inService', colorKey: 'done' },
];

export function BoardScreen() {
  const theme = useTheme();
  const { t } = useT();
  const dir = useDirection();
  const nav = useNavigation<Nav>();
  const devices = useWork((s) => s.devices);

  const grouped = useMemo(() => {
    const map: Record<string, DeviceWithTrip[]> = {};
    COLUMNS.forEach((c) => (map[c.status] = []));
    devices.forEach((d) => {
      if (map[d.status]) map[d.status].push(d);
    });
    return map;
  }, [devices]);

  return (
    <Screen edges={[]}>
      <View style={{ padding: theme.spacing.lg }}>
        <Row style={{ gap: 8 }}>
          <Icon name="view-column-outline" size={26} color={theme.colors.primary} />
          <AppText size="title" weight="700">
            {t('board.title')}
          </AppText>
        </Row>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: 12 }}>
        {COLUMNS.map((col) => {
          const color = theme.colors[col.colorKey];
          const items = grouped[col.status] ?? [];
          return (
            <View key={col.status} style={[styles.column, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Row style={{ gap: 8, padding: theme.spacing.md, flexDirection: dir.row }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                <AppText size="body" weight="700" style={{ flex: 1 }}>
                  {t(col.key)}
                </AppText>
                <AppText size="small" weight="700" color={color}>
                  {items.length}
                </AppText>
              </Row>

              <ScrollView contentContainerStyle={{ padding: theme.spacing.md, paddingTop: 0 }} showsVerticalScrollIndicator={false}>
                {items.length === 0 ? (
                  <AppText size="small" muted align="center" style={{ marginTop: theme.spacing.lg }}>
                    {t('common.none')}
                  </AppText>
                ) : (
                  items.map((d) => (
                    <Pressable key={d.id} onPress={() => nav.navigate('Device', { id: d.id })} style={{ marginBottom: theme.spacing.sm }}>
                      <Card style={{ borderLeftWidth: 4, borderLeftColor: d.is_late ? theme.colors.late : color }}>
                        <AppText size="body" weight="600" numberOfLines={1}>
                          {d.type}
                        </AppText>
                        <AppText size="small" muted numberOfLines={1}>
                          {d.inventory_no}
                        </AppText>
                        <Spacer size="xs" />
                        <Row style={{ gap: 6 }}>
                          <Icon name="hospital-building" size={13} color={theme.colors.textMuted} />
                          <AppText size="tiny" muted numberOfLines={1} style={{ flex: 1 }}>
                            {d.department}
                          </AppText>
                        </Row>
                        {d.is_late ? (
                          <>
                            <Spacer size="xs" />
                            <AppText size="tiny" weight="700" color={theme.colors.late}>
                              {t('today.daysLate', { count: d.days_late })}
                            </AppText>
                          </>
                        ) : null}
                      </Card>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  column: { width: 260, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});

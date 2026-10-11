// Board view: a horizontal kanban of devices by status (spec 5.1 "Vue tableau").
// Redesign: soft snap columns + compact mini cards (see design prototype `.board`/`.col`/`.mini`).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Entry, PressScale } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { AppText, Icon, Row, Tag } from '@/components/ui';
import type { DeviceWithTrip } from '@/data/queries';
import { useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';
import { cardShadow, type Palette } from '@/theme/tokens';
import type { DeviceStatus } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Column {
  status: DeviceStatus;
  key: string;
  colorKey: keyof Palette;
}

const COLUMNS: Column[] = [
  { status: 'in_office', key: 'board.inOffice', colorKey: 'textMuted' },
  { status: 'at_company', key: 'board.atCompany', colorKey: 'info' },
  { status: 'ready_for_pickup', key: 'board.ready', colorKey: 'due' },
  { status: 'back_in_service', key: 'board.inService', colorKey: 'done' },
];

export function BoardScreen() {
  const theme = useTheme();
  const { t } = useT();
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const devices = useWork((s) => s.devices);

  const colWidth = Math.min(width * 0.8, 280);

  const grouped = useMemo(() => {
    const map: Record<string, DeviceWithTrip[]> = {};
    COLUMNS.forEach((c) => (map[c.status] = []));
    devices.forEach((d) => {
      if (map[d.status]) map[d.status].push(d);
    });
    return map;
  }, [devices]);

  const miniStyle = {
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.line,
    borderRadius: 14,
    padding: theme.spacing.md,
    ...cardShadow(theme.mode, 1),
  } as const;

  return (
    <Screen edges={[]}>
      {/* Small muted hint (icon + word), matching the prototype's top line. */}
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xs }}>
        <Entry>
          <Row style={{ gap: 8 }}>
            <Icon name="layers-outline" size={14} color={theme.colors.textMuted} />
            <AppText size="small" muted style={{ flex: 1 }}>
              {t('common.open')}
            </AppText>
          </Row>
        </Entry>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{
          gap: 12,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.xl,
          flexGrow: 1,
          alignItems: 'stretch',
        }}
      >
        {COLUMNS.map((col, ci) => {
          const color = theme.colors[col.colorKey];
          const items = grouped[col.status] ?? [];
          return (
            <Entry key={col.status} delay={ci * 70} style={{ width: colWidth }}>
              <View style={{ flex: 1 }}>
                {/* Column header: dot + bold title + tinted count pill. */}
                <Row style={{ gap: 8, marginBottom: theme.spacing.sm }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
                  <AppText size="body" weight="700" numberOfLines={1} style={{ flex: 1 }}>
                    {t(col.key)}
                  </AppText>
                  <View
                    accessibilityLabel={`${items.length}`}
                    style={{
                      minWidth: 30,
                      height: 30,
                      paddingHorizontal: 9,
                      borderRadius: 15,
                      backgroundColor: color + '26',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText size="small" weight="700" color={color}>
                      {items.length}
                    </AppText>
                  </View>
                </Row>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.spacing.lg }}>
                  {items.length === 0 ? (
                    <View style={[miniStyle, { backgroundColor: theme.colors.surface2 }]}>
                      <AppText size="small" muted align="center">
                        {t('today.allGood')}
                      </AppText>
                    </View>
                  ) : (
                    items.map((d) => (
                      <PressScale
                        key={d.id}
                        onPress={() => nav.navigate('Device', { id: d.id })}
                        accessibilityRole="button"
                        accessibilityLabel={`${d.type} ${d.inventory_no}`}
                        style={{ marginBottom: 10 }}
                      >
                        <View style={miniStyle}>
                          <AppText size="body" weight="700" numberOfLines={1}>
                            {d.type} · {d.brand}
                          </AppText>
                          <AppText size="tiny" muted numberOfLines={1}>
                            {d.inventory_no} · {d.department}
                          </AppText>
                          {d.is_late ? (
                            <View style={{ marginTop: 6 }}>
                              <Tag tone="late" icon="alert-outline" label={t('today.daysLate', { count: d.days_late })} />
                            </View>
                          ) : null}
                        </View>
                      </PressScale>
                    ))
                  )}
                </ScrollView>
              </View>
            </Entry>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

// A device card used on Today and Devices. Swipe, tap and long-press (spec 5.1).
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SwipeRow } from '@/components/SwipeRow';
import { Tag } from '@/components/StatusChip';
import { AppText, Icon, type IconName } from '@/components/ui';
import type { DeviceWithTrip } from '@/data/queries';
import { useDirection, useT } from '@/i18n';
import { deviceIcon } from '@/lib/status';
import { useTheme } from '@/theme/ThemeProvider';

export function DeviceCard({
  device,
  onPress,
  onLongPress,
  onSwipeReturned,
  onSwipeRemind,
  showCompany = true,
  criticalPulse = true,
}: {
  device: DeviceWithTrip;
  onPress?: () => void;
  onLongPress?: () => void;
  onSwipeReturned?: () => void;
  onSwipeRemind?: () => void;
  showCompany?: boolean;
  criticalPulse?: boolean;
}) {
  const theme = useTheme();
  const { t } = useT();
  const dir = useDirection();

  const isLate = device.is_late;
  const isCritical = device.critical_department && device.status === 'at_company';
  const accent = isLate ? theme.colors.late : isCritical ? theme.colors.critical : device.status === 'at_company' ? theme.colors.info : theme.colors.textMuted;

  const dayLabel = isLate
    ? t('today.daysLate', { count: device.days_late })
    : device.expected_return_date
      ? t('today.daysLeft', { count: Math.max(0, device.days_left) })
      : '';

  return (
    <SwipeRow
      rightLabel={t('today.returnedAction')}
      rightIcon="check"
      rightColor={theme.colors.done}
      leftLabel={t('today.remindAction')}
      leftIcon="bell-ring-outline"
      leftColor={theme.colors.due}
      onSwipeRight={onSwipeReturned}
      onSwipeLeft={onSwipeRemind}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={`${device.type} ${device.inventory_no}`}
        style={({ pressed }) => [
          styles.card,
          {
            borderColor: theme.colors.border,
            borderLeftWidth: 5,
            borderLeftColor: accent,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={[styles.row, { flexDirection: dir.row }]}>
          <View style={[styles.iconBox, { backgroundColor: accent + '1A' }]}>
            <Icon name={deviceIcon(device.type) as IconName} size={26} color={accent} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText size="body" weight="600" numberOfLines={1}>
              {device.type} · {device.brand}
            </AppText>
            <AppText size="small" muted numberOfLines={1}>
              {device.inventory_no}
              {showCompany && device.trip_company_name ? ` · ${device.trip_company_name}` : ''}
            </AppText>
            <View style={[styles.tags, { flexDirection: dir.row }]}>
              <Tag label={device.department} icon="hospital-building" color={isCritical ? theme.colors.critical : theme.colors.textMuted} />
              {isLate ? <Tag label={t('today.late')} icon="alert-circle" color={theme.colors.late} /> : null}
            </View>
          </View>
          {dayLabel ? (
            <View style={[styles.right, { alignItems: dir.isRTL ? 'flex-start' : 'flex-end' }]}>
              <AppText size="small" weight="700" color={accent}>
                {dayLabel}
              </AppText>
            </View>
          ) : null}
        </View>
      </Pressable>
    </SwipeRow>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  row: { alignItems: 'center', gap: 12 },
  iconBox: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tags: { alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  right: { minWidth: 70, justifyContent: 'center' },
});

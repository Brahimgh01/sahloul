// A device card used on Today and Devices. Swipe, tap and long-press (spec 5.1).
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { SwipeRow } from '@/components/SwipeRow';
import { Tag } from '@/components/StatusChip';
import { AppText, Icon, type IconName } from '@/components/ui';
import type { DeviceWithTrip } from '@/data/queries';
import { useDirection, useT } from '@/i18n';
import { deviceIcon } from '@/lib/status';
import { cardShadow } from '@/theme/tokens';
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
  const isAtCompany = device.status === 'at_company';
  const accent = isLate
    ? theme.colors.late
    : isCritical
      ? theme.colors.critical
      : isAtCompany
        ? theme.colors.info
        : device.status === 'ready_for_pickup'
          ? theme.colors.due
          : theme.colors.textMuted;

  const dayLabel = isLate
    ? t('today.daysLate', { count: device.days_late })
    : device.expected_return_date
      ? t('today.daysLeft', { count: Math.max(0, device.days_left) })
      : '';

  // A gentle red halo that breathes on critical devices.
  const glow = useSharedValue(0);
  React.useEffect(() => {
    if (isCritical && criticalPulse && !theme.reduceMotion) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      glow.value = 0;
    }
  }, [isCritical, criticalPulse, theme.reduceMotion, glow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.12 + 0.55 * glow.value }));

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
          cardShadow(theme.mode, 1),
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
        ]}
      >
        <View style={[styles.accent, { backgroundColor: accent }]} />
        {isCritical ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { borderColor: theme.colors.critical }, glowStyle]}
          />
        ) : null}
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
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 5,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
  },
  row: { alignItems: 'center', gap: 12, paddingLeft: 6 },
  iconBox: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tags: { alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  right: { minWidth: 70, justifyContent: 'center' },
});

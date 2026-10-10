// Status chip: never color alone - color + icon + word (spec golden rule 5).
import React from 'react';
import { View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { useT } from '@/i18n';
import { DEVICE_STATUS, TRIP_RESULT } from '@/lib/status';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import type { DeviceStatus, TripResult } from '@/types';

export function StatusChip({ status }: { status: DeviceStatus }) {
  const theme = useTheme();
  const { t } = useT();
  const meta = DEVICE_STATUS[status];
  const color = theme.colors[meta.colorKey];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        minHeight: 28,
        borderRadius: radius.pill,
        backgroundColor: color + '22',
      }}
    >
      <Icon name={meta.icon} size={15} color={color} />
      <AppText size="tiny" weight="600" color={color}>
        {t(meta.i18nKey)}
      </AppText>
    </View>
  );
}

export function ResultChip({ result }: { result: TripResult }) {
  const theme = useTheme();
  const { t } = useT();
  const meta = TRIP_RESULT[result];
  const color = theme.colors[meta.colorKey];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        minHeight: 28,
        borderRadius: radius.pill,
        backgroundColor: color + '22',
      }}
    >
      <Icon name={meta.icon} size={15} color={color} />
      <AppText size="tiny" weight="600" color={color}>
        {t(meta.i18nKey)}
      </AppText>
    </View>
  );
}

// A simple labelled tag (department, contract, etc).
export function Tag({ label, color, icon }: { label: string; color?: string; icon?: React.ComponentProps<typeof Icon>['name'] }) {
  const theme = useTheme();
  const c = color ?? theme.colors.textMuted;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        minHeight: 24,
        borderRadius: radius.sm,
        backgroundColor: c + '1A',
      }}
    >
      {icon ? <Icon name={icon} size={13} color={c} /> : null}
      <AppText size="tiny" weight="600" color={c}>
        {label}
      </AppText>
    </View>
  );
}

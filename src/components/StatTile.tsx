// A colourful stat tile (number + label + icon). The number counts up.
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Gradient } from '@/components/Gradient';
import { PressScale, useCountUp } from '@/components/Motion';
import { AppText, Icon, type IconName } from '@/components/ui';
import { cardShadow } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export function StatTile({
  icon,
  value,
  label,
  colors,
  onPress,
  style,
}: {
  icon: IconName;
  value: number;
  label: string;
  colors: readonly string[];
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const shown = useCountUp(value);

  const body = (
    <Gradient
      colors={colors}
      radius={theme.radius.lg}
      style={[styles.tile, cardShadow(theme.mode, 2), style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.iconWrap}>
        <Icon name={icon} size={20} color="#fff" />
      </View>
      <AppText size="huge" weight="700" color="#fff">
        {shown}
      </AppText>
      <AppText size="tiny" weight="600" color="rgba(255,255,255,0.92)">
        {label}
      </AppText>
    </Gradient>
  );

  if (!onPress) return body;
  return <PressScale onPress={onPress} style={styles.press}>{body}</PressScale>;
}

const styles = StyleSheet.create({
  tile: { flex: 1, minHeight: 104, padding: 12, justifyContent: 'space-between' },
  press: { flex: 1 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});

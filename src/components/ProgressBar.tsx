// An animated progress bar. Fills with a spring when the value changes.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Gradient } from '@/components/Gradient';
import { gradients } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export function ProgressBar({
  value,
  height = 12,
  colors = gradients.brand,
}: {
  /** 0..1 */
  value: number;
  height?: number;
  colors?: readonly string[];
}) {
  const theme = useTheme();
  const w = useSharedValue(0);

  React.useEffect(() => {
    w.value = withSpring(Math.max(0, Math.min(1, value)), { damping: 18, stiffness: 110 });
  }, [value, w]);

  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: theme.colors.cardAlt },
      ]}
    >
      <Animated.View style={[{ height, borderRadius: height / 2, overflow: 'hidden' }, fill]}>
        <Gradient colors={colors} radius={height / 2} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
});

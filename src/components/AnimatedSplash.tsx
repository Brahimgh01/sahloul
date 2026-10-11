// The animated launch screen: brand gradient, the hub logo breathing, and a
// wave of loading dots. Shown while fonts load and the database wakes up.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Gradient } from '@/components/Gradient';
import { Logo } from '@/components/Logo';
import { AppText } from '@/components/ui';
import { gradients } from '@/theme/tokens';

function Dot({ index }: { index: number }) {
  const v = useSharedValue(0);
  React.useEffect(() => {
    v.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [v]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.65 * v.value,
    transform: [{ translateY: -6 * v.value }],
  }));
  return (
    <Animated.View
      style={[
        { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF', marginHorizontal: 5 },
        style,
      ]}
    />
  );
}

export function AnimatedSplash({ label }: { label?: string }) {
  const breathe = useSharedValue(0);
  const rise = useSharedValue(0);

  React.useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    rise.value = withDelay(120, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [breathe, rise]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.96 + 0.06 * breathe.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 16 }],
  }));

  return (
    <View style={styles.root}>
      <Gradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.blob, { top: -60, left: -40, backgroundColor: 'rgba(255,255,255,0.12)' }]} />
      <View style={[styles.blob, { bottom: -80, right: -50, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.10)' }]} />

      <Animated.View style={logoStyle}>
        <Logo size={132} />
      </Animated.View>

      <Animated.View style={[{ alignItems: 'center', marginTop: 22 }, textStyle]}>
        <AppText size="title" weight="700" color="#FFFFFF">
          S-IT Hub
        </AppText>
        <AppText size="small" weight="500" color="rgba(255,255,255,0.85)">
          {label ?? 'Le hub du parc informatique'}
        </AppText>
      </Animated.View>

      <View style={styles.dots}>
        <Dot index={0} />
        <Dot index={1} />
        <Dot index={2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  blob: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  dots: { position: 'absolute', bottom: 72, flexDirection: 'row' },
});

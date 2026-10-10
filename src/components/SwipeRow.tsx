// Swipe a card right = first action, left = second action (spec 5.1).
// Built with the Gesture API + Reanimated so it stays smooth on cheap phones.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText, Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

const THRESHOLD = 96;

export function SwipeRow({
  children,
  rightLabel,
  rightIcon,
  rightColor,
  leftLabel,
  leftIcon,
  leftColor,
  onSwipeRight,
  onSwipeLeft,
  enabled = true,
}: {
  children: React.ReactNode;
  rightLabel: string;
  rightIcon: IconName;
  rightColor: string;
  leftLabel: string;
  leftIcon: IconName;
  leftColor: string;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  enabled?: boolean;
}) {
  const theme = useTheme();
  const x = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-12, 12])
    .onUpdate((e) => {
      x.value = Math.max(-140, Math.min(140, e.translationX));
    })
    .onEnd((e) => {
      if (e.translationX > THRESHOLD && onSwipeRight) {
        x.value = withSpring(160, { damping: 18 });
        runOnJS(onSwipeRight)();
        x.value = withSpring(0, { damping: 18 });
      } else if (e.translationX < -THRESHOLD && onSwipeLeft) {
        x.value = withSpring(-160, { damping: 18 });
        runOnJS(onSwipeLeft)();
        x.value = withSpring(0, { damping: 18 });
      } else {
        x.value = withSpring(0, { damping: 18 });
      }
    });

  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ opacity: x.value > 8 ? 1 : 0 }));
  const leftStyle = useAnimatedStyle(() => ({ opacity: x.value < -8 ? 1 : 0 }));

  return (
    <View style={styles.wrap}>
      {/* Revealed when swiping RIGHT */}
      <Animated.View style={[styles.action, styles.leftAction, { backgroundColor: rightColor }, rightStyle]}>
        <Icon name={rightIcon} size={24} color="#fff" />
        <AppText size="small" weight="700" color="#fff">
          {rightLabel}
        </AppText>
      </Animated.View>
      {/* Revealed when swiping LEFT */}
      <Animated.View style={[styles.action, styles.rightAction, { backgroundColor: leftColor }, leftStyle]}>
        <Icon name={leftIcon} size={24} color="#fff" />
        <AppText size="small" weight="700" color="#fff">
          {leftLabel}
        </AppText>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ backgroundColor: theme.colors.card }, contentStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 20, overflow: 'hidden', marginBottom: 10 },
  action: { position: 'absolute', top: 0, bottom: 0, width: 140, alignItems: 'center', justifyContent: 'center', gap: 4 },
  leftAction: { left: 0 },
  rightAction: { right: 0 },
});

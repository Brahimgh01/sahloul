// Small motion helpers used all over the app: staggered entrances, a springy
// press, a counting number and a looping pulse.
import React from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/** Fade + slide up on mount, with an optional stagger delay in ms. */
export function Entry({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(340).easing(Easing.out(Easing.cubic))} style={style}>
      {children}
    </Animated.View>
  );
}

/** A press that squishes like a physical button. */
export function PressScale({
  children,
  style,
  scaleTo = 0.955,
  ...rest
}: PressableProps & { children: React.ReactNode; style?: ViewStyle; scaleTo?: number }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[anim, style]}>
      <Pressable
        {...rest}
        onPressIn={(e) => {
          s.value = withSpring(scaleTo, { damping: 16, stiffness: 380 });
          rest.onPressIn?.(e);
        }}
        onPressOut={(e) => {
          s.value = withSpring(1, { damping: 14, stiffness: 300 });
          rest.onPressOut?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Counts from 0 (or the previous value) up to `value`. */
export function useCountUp(value: number, duration = 700): number {
  const [display, setDisplay] = React.useState(0);
  const from = React.useRef(0);
  React.useEffect(() => {
    const start = Date.now();
    const a = from.current;
    const b = value;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(a + (b - a) * e));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

/** A gentle looping breathe (used by the floating mic and success states). */
export function useBreathe(min = 0.98, max = 1.06, ms = 1600) {
  const v = useSharedValue(0);
  React.useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [v, ms]);
  return useAnimatedStyle(() => ({ transform: [{ scale: min + (max - min) * v.value }] }));
}

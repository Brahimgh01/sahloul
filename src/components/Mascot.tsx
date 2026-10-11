// "Nova", the little assistant mascot. A friendly robot drawn with SVG, gently
// bobbing. Used on the assistant screen and empty states.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

export function Mascot({
  size = 96,
  mood = 'happy',
  color = '#4F46E5',
  animate = true,
}: {
  size?: number;
  mood?: 'happy' | 'think' | 'cheer';
  color?: string;
  animate?: boolean;
}) {
  const bob = useSharedValue(0);
  React.useEffect(() => {
    if (!animate) return;
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [animate, bob]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * bob.value }, { rotate: `${-1.5 + 3 * bob.value}deg` }],
  }));

  const eyeY = mood === 'think' ? 50 : 52;
  const smile =
    mood === 'cheer'
      ? 'M 44 66 Q 60 84 76 66'
      : mood === 'think'
        ? 'M 47 68 Q 60 76 73 68'
        : 'M 45 65 Q 60 78 75 65';

  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          {/* arms */}
          <G>
            <Rect x="12" y="86" width="12" height="26" rx="6" fill={color} opacity={0.9} />
            <Rect x="96" y="86" width="12" height="26" rx="6" fill={color} opacity={0.9} />
          </G>
          {/* body */}
          <Rect x="28" y="84" width="64" height="30" rx="15" fill={color} />
          <Circle cx="60" cy="99" r="6" fill="#FFFFFF" opacity={0.85} />
          {/* antenna */}
          <Line x1="60" y1="26" x2="60" y2="12" stroke={color} strokeWidth={4} strokeLinecap="round" />
          <Circle cx="60" cy="9" r="6" fill="#F59E0B" />
          {/* head */}
          <Rect x="20" y="22" width="80" height="68" rx="26" fill={color} />
          <Rect x="27" y="30" width="66" height="52" rx="20" fill="#FFFFFF" opacity={0.14} />
          {/* eyes */}
          <Circle cx="46" cy={eyeY} r="8" fill="#FFFFFF" />
          <Circle cx="74" cy={eyeY} r="8" fill="#FFFFFF" />
          <Circle cx="47.5" cy={eyeY + 1} r="3.4" fill="#1E293B" />
          <Circle cx="75.5" cy={eyeY + 1} r="3.4" fill="#1E293B" />
          {/* cheeks */}
          <Circle cx="37" cy="66" r="4" fill="#FB7185" opacity={0.75} />
          <Circle cx="83" cy="66" r="4" fill="#FB7185" opacity={0.75} />
          {/* smile */}
          <Path d={smile} stroke="#FFFFFF" strokeWidth={3.4} strokeLinecap="round" fill="none" />
        </Svg>
      </View>
    </Animated.View>
  );
}

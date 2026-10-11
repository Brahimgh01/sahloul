// The floating microphone that lives on every screen (spec 5).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Gradient } from '@/components/Gradient';
import { Icon } from '@/components/ui';
import { useDirection, useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { haptic, playSound } from '@/services/feedback';
import { useSettings } from '@/store/settings';
import { cardShadow, gradients } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export function FloatingMic({ bottom = 92 }: { bottom?: number }) {
  const theme = useTheme();
  const dir = useDirection();
  const { t } = useT();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const enabled = useSettings((s) => s.assistantEnabled);
  const pulse = useSharedValue(0);

  React.useEffect(() => {
    if (theme.reduceMotion) return;
    pulse.value = withRepeat(withTiming(1, { duration: 2200 }), -1, true);
  }, [pulse, theme.reduceMotion]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.6 }],
  }));

  if (!enabled) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom, [dir.isRTL ? 'left' : 'right']: 18 }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { backgroundColor: theme.colors.primary }, ring]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('assistant.title')}
        onPress={() => {
          haptic('select');
          navigation.navigate('Assistant');
        }}
        style={[styles.button, cardShadow(theme.mode, 2)]}
      >
        <Gradient colors={gradients.brand} radius={29} style={StyleSheet.absoluteFill} />
        <Icon name="microphone" size={26} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 58, height: 58, borderRadius: 29 },
  button: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

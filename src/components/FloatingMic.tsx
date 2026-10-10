// The floating microphone that lives on every screen (spec 5).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui';
import { useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { haptic, playSound } from '@/services/feedback';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';

export function FloatingMic({ bottom = 92 }: { bottom?: number }) {
  const theme = useTheme();
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
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          { backgroundColor: theme.colors.primary },
          ring,
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('assistant.title')}
        onPress={() => {
          haptic('select');
          navigation.navigate('Assistant');
        }}
        style={[
          styles.button,
          { backgroundColor: theme.colors.primary, shadowColor: '#000' },
        ]}
      >
        <Icon name="microphone" size={26} color={theme.colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 18, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 58, height: 58, borderRadius: 29 },
  button: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
});

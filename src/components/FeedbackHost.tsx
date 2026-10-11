// Mounted once at the top of the app. Renders the floating toast (with Undo)
// and the confetti burst, above every screen.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Confetti } from '@/components/Confetti';
import { AppText, Icon, type IconName } from '@/components/ui';
import { useFeedback } from '@/store/feedback';
import { cardShadow } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export function FeedbackHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const t = useFeedback((s) => s.toast);
  const hide = useFeedback((s) => s.hideToast);
  const confetti = useFeedback((s) => s.confetti);
  const [showConfetti, setShowConfetti] = React.useState(false);

  // Auto-hide the toast.
  React.useEffect(() => {
    if (!t) return;
    const ms = t.durationMs ?? 4200;
    const id = setTimeout(() => hide(), ms);
    return () => clearTimeout(id);
  }, [t, hide]);

  // Trigger a confetti burst each time the counter increments.
  React.useEffect(() => {
    if (confetti === 0) return;
    setShowConfetti(true);
    const id = setTimeout(() => setShowConfetti(false), 1600);
    return () => clearTimeout(id);
  }, [confetti]);

  const tone = t?.tone ?? 'default';
  const accent =
    tone === 'success'
      ? theme.colors.success
      : tone === 'danger'
        ? theme.colors.danger
        : tone === 'warn'
          ? theme.colors.warn
          : theme.colors.brand;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Confetti visible={showConfetti} />
      {t ? (
        <Animated.View
          key={t.id}
          entering={FadeInDown.duration(240)}
          exiting={FadeOutDown.duration(200)}
          style={[
            styles.toast,
            {
              bottom: insets.bottom + 92,
              backgroundColor: theme.mode === 'dark' ? theme.colors.surface2 : theme.colors.text,
              borderColor: theme.colors.line,
              ...cardShadow(theme.mode, 2),
            },
          ]}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              backgroundColor: accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={(t.icon as IconName) ?? 'check'} size={20} color="#FFFFFF" />
          </View>
          <AppText
            size="small"
            weight="600"
            color={theme.mode === 'dark' ? theme.colors.text : theme.colors.surface}
            style={{ flex: 1 }}
          >
            {t.message}
          </AppText>
          {t.onUndo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.undoLabel ?? 'Undo'}
              onPress={() => {
                t.onUndo?.();
                hide();
              }}
              hitSlop={10}
              style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 6 }}
            >
              <AppText size="small" weight="700" color={theme.mode === 'dark' ? theme.colors.brand : '#8AB4FF'}>
                {t.undoLabel ?? 'Annuler'}
              </AppText>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

// Bottom tab bar with a raised, animated centre button (spec 5).
// The centre button opens two actions: Send a device / Scan a paper.
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Gradient } from '@/components/Gradient';
import { AppText, Icon, type IconName } from '@/components/ui';
import { useDirection, useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { haptic } from '@/services/feedback';
import { cardShadow, gradients } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const TAB_ICONS: Record<string, IconName> = {
  Today: 'calendar-today',
  Devices: 'devices',
  Companies: 'factory',
  Papers: 'file-document-multiple-outline',
};

const TAB_LABELS: Record<string, string> = {
  Today: 'tabs.today',
  Devices: 'tabs.devices',
  Companies: 'tabs.companies',
  Papers: 'tabs.papers',
};

function TabItem({
  focused,
  icon,
  label,
  onPress,
}: {
  focused: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const pill = useSharedValue(focused ? 1 : 0);
  const color = focused ? theme.colors.primary : theme.colors.textMuted;

  React.useEffect(() => {
    pill.value = withSpring(focused ? 1 : 0, { damping: 16, stiffness: 220 });
  }, [focused, pill]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: 0.16 * pill.value,
    transform: [{ scale: 0.7 + 0.3 * pill.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 * pill.value }, { scale: 1 + 0.12 * pill.value }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.tab}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.pill, { backgroundColor: theme.colors.primary }, pillStyle]}
      />
      <Animated.View style={iconStyle}>
        <Icon name={icon} size={24} color={color} />
      </Animated.View>
      <AppText size="tiny" weight={focused ? '700' : '500'} color={color}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const dir = useDirection();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [open, setOpen] = useState(false);

  const turn = useSharedValue(0);
  const pop = useSharedValue(0);
  React.useEffect(() => {
    turn.value = withSpring(open ? 1 : 0, { damping: 14, stiffness: 260 });
  }, [open, turn]);
  React.useEffect(() => {
    pop.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pop]);

  const centerIcon = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 135}deg` }],
  }));
  const halo = useAnimatedStyle(() => ({
    opacity: 0.25 * (1 - pop.value),
    transform: [{ scale: 1 + 0.5 * pop.value }],
  }));

  const renderTab = (index: number) => {
    const route = state.routes[index];
    const focused = state.index === index;
    return (
      <TabItem
        key={route.key}
        focused={focused}
        icon={TAB_ICONS[route.name]}
        label={t(TAB_LABELS[route.name])}
        onPress={() => {
          haptic('select');
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
      />
    );
  };

  const go = (screen: 'Send' | 'Scan') => {
    setOpen(false);
    haptic('light');
    rootNav.navigate(screen);
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
          ...cardShadow(theme.mode, 2),
        },
      ]}
    >
      <View style={[styles.row, { flexDirection: dir.row }]}>
        {renderTab(0)}
        {renderTab(1)}
        <View style={styles.centerGap} />
        {renderTab(2)}
        {renderTab(3)}
      </View>

      {/* Raised centre button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('send.title')}
        onPress={() => {
          haptic('light');
          setOpen(true);
        }}
        style={styles.centerWrap}
      >
        <Animated.View style={[styles.halo, { backgroundColor: theme.colors.primary }, halo]} />
        <View style={[styles.center, { borderColor: theme.colors.card, shadowColor: '#000' }]}>
          <Gradient colors={gradients.brand} style={StyleSheet.absoluteFill} />
          <Animated.View style={centerIcon}>
            <Icon name="plus" size={30} color="#fff" />
          </Animated.View>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.card }]}>
            <View style={styles.grabber}>
              <View style={[styles.grabberBar, { backgroundColor: theme.colors.border }]} />
            </View>
            <Pressable onPress={() => go('Send')} style={styles.action}>
              <Gradient colors={gradients.brand} radius={theme.radius.lg} style={styles.actionIcon}>
                <Icon name="truck-fast-outline" size={26} color="#fff" />
              </Gradient>
              <View style={{ flex: 1 }}>
                <AppText size="body" weight="700">
                  {t('send.title')}
                </AppText>
                <AppText size="tiny" muted>
                  {t('tabs.devices')}
                </AppText>
              </View>
              <Icon name="chevron-right" size={22} color={theme.colors.textFaint} />
            </Pressable>
            <Pressable onPress={() => go('Scan')} style={styles.action}>
              <Gradient colors={gradients.calm} radius={theme.radius.lg} style={styles.actionIcon}>
                <Icon name="line-scan" size={26} color="#fff" />
              </Gradient>
              <View style={{ flex: 1 }}>
                <AppText size="body" weight="700">
                  {t('scan.title')}
                </AppText>
                <AppText size="tiny" muted>
                  {t('tabs.papers')}
                </AppText>
              </View>
              <Icon name="chevron-right" size={22} color={theme.colors.textFaint} />
            </Pressable>
            <Pressable style={styles.cancel} onPress={() => setOpen(false)}>
              <AppText size="body" weight="600" color={theme.colors.textMuted}>
                {t('common.cancel')}
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  row: { alignItems: 'center', justifyContent: 'space-between' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 48 },
  pill: { position: 'absolute', top: 4, width: 46, height: 34, borderRadius: 17 },
  centerGap: { width: 72 },
  centerWrap: {
    position: 'absolute',
    top: -26,
    alignSelf: 'center',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: { position: 'absolute', width: 64, height: 64, borderRadius: 32 },
  center: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, paddingTop: 8, gap: 10 },
  grabber: { alignItems: 'center', paddingVertical: 8 },
  grabberBar: { width: 44, height: 5, borderRadius: 3 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingHorizontal: 4 },
  actionIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  cancel: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 2 },
});

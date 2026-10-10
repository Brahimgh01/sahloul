// Bottom tab bar with a raised round button in the centre (spec 5).
// The centre button opens two actions: Send a device / Scan a paper.
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Icon, type IconName } from '@/components/ui';
import { useDirection, useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { haptic } from '@/services/feedback';
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

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const dir = useDirection();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [open, setOpen] = useState(false);

  const renderTab = (index: number) => {
    const route = state.routes[index];
    const focused = state.index === index;
    const color = focused ? theme.colors.primary : theme.colors.textMuted;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={t(TAB_LABELS[route.name])}
        onPress={() => {
          haptic('select');
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        style={styles.tab}
      >
        <Icon name={focused ? TAB_ICONS[route.name] : (TAB_ICONS[route.name] as IconName)} size={24} color={color} />
        <AppText size="tiny" weight={focused ? '700' : '500'} color={color}>
          {t(TAB_LABELS[route.name])}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
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
        style={[
          styles.center,
          { backgroundColor: theme.colors.primary, borderColor: theme.colors.card, shadowColor: '#000' },
        ]}
      >
        <Icon name="plus" size={30} color={theme.colors.onPrimary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.card }]}>
            <Pressable
              style={[styles.action, { borderColor: theme.colors.border }]}
              onPress={() => {
                setOpen(false);
                rootNav.navigate('Send');
              }}
            >
              <Icon name="truck-fast-outline" size={26} color={theme.colors.primary} />
              <AppText size="body" weight="600">
                {t('send.title')}
              </AppText>
            </Pressable>
            <Pressable
              style={[styles.action, { borderColor: theme.colors.border }]}
              onPress={() => {
                setOpen(false);
                rootNav.navigate('Scan');
              }}
            >
              <Icon name="line-scan" size={26} color={theme.colors.primary} />
              <AppText size="body" weight="600">
                {t('scan.title')}
              </AppText>
            </Pressable>
            <Pressable style={[styles.action, { borderColor: 'transparent' }]} onPress={() => setOpen(false)}>
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
  centerGap: { width: 72 },
  center: {
    position: 'absolute',
    top: -26,
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, gap: 10 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

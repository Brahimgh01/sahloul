// Shared top app bar for the four tab screens. Matches the redesign: a soft
// surface strip with a greeting (Home) or a title, plus right-hand actions.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Display } from '@/components/ui';
import { useDirection } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export function AppBar({
  title,
  greeting,
  right,
  scrolled,
}: {
  title?: string;
  greeting?: string;
  right?: React.ReactNode;
  scrolled?: boolean;
}) {
  const theme = useTheme();
  const dir = useDirection();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surface,
          paddingTop: insets.top,
          borderBottomColor: scrolled ? theme.colors.line : 'transparent',
          borderBottomWidth: scrolled ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      <View style={[styles.row, { flexDirection: dir.row }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {greeting ? (
            <AppText size="small" weight="600" muted numberOfLines={1}>
              {greeting}
            </AppText>
          ) : null}
          {title ? (
            <Display size={greeting ? 'title' : 'title'} weight="700" numberOfLines={1}>
              {title}
            </Display>
          ) : null}
        </View>
        <View style={[styles.actions, { flexDirection: dir.row }]}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingBottom: 12 },
  row: { alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8, minHeight: 52 },
  actions: { alignItems: 'center', gap: 4 },
});

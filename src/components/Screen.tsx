// Shared screen shell: background + safe area + the floating microphone.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingMic } from '@/components/FloatingMic';
import { useTheme } from '@/theme/ThemeProvider';

export function Screen({
  children,
  hideMic,
  edges = ['top'],
  padded = false,
}: {
  children: React.ReactNode;
  hideMic?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  padded?: boolean;
}) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.flex, padded && { paddingHorizontal: theme.spacing.lg }]}>{children}</View>
      {!hideMic ? <FloatingMic /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });

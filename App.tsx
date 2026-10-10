// App entry: providers, fonts, first-run demo data, notifications.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Font keys are read by prefix so a slightly different export name still works.
import * as NotoSans from '@expo-google-fonts/noto-sans';
import * as NotoSansArabic from '@expo-google-fonts/noto-sans-arabic';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';

import { loadDemoData } from '@/data/demo';
import { getDb } from '@/db';
import { count } from '@/db/repo';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useConnectivity } from '@/services/connectivity';
import { setupNotifications } from '@/services/notifications';
import { useSettings } from '@/store/settings';
import { useWork } from '@/store/work';
import { setFontsReady } from '@/theme/fonts';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

// Show alerts even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function collectFonts(ns: Record<string, unknown>, prefix: string): Record<string, number> {
  const out: Record<string, number> = {};
  Object.keys(ns).forEach((k) => {
    const v = ns[k];
    if (k.startsWith(prefix) && typeof v === 'number') out[k] = v;
  });
  return out;
}

function Loading() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}

// Prepares the database, demo data and notifications before showing screens.
function Boot({ children }: { children: React.ReactNode }) {
  const refresh = useWork((s) => s.refresh);
  const startConnectivity = useConnectivity((s) => s.start);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = startConnectivity();
    (async () => {
      try {
        await getDb();
        // First run with an empty database: load demo data so the app is alive.
        const n = await count(`SELECT COUNT(*) as n FROM devices`);
        if (n === 0) {
          await loadDemoData();
          useSettings.getState().set({ demoLoaded: true });
        }
        await setupNotifications();
        await refresh();
      } catch (e) {
        console.warn('boot error', e);
      } finally {
        setReady(true);
      }
    })();
    return unsub;
  }, [refresh, startConnectivity]);

  if (!ready) return <Loading />;
  return <>{children}</>;
}

function StatusBarHost() {
  const theme = useTheme();
  return <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  const [loaded, error] = useFonts({
    ...collectFonts(NotoSans as unknown as Record<string, unknown>, 'NotoSans_'),
    ...collectFonts(NotoSansArabic as unknown as Record<string, unknown>, 'NotoSansArabic_'),
  });

  useEffect(() => {
    setFontsReady(loaded && !error);
  }, [loaded, error]);

  // Render once fonts settle (success OR failure - we fall back gracefully).
  const fontsDone = loaded || !!error;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBarHost />
          <Boot>{fontsDone ? <RootNavigator /> : <Loading />}</Boot>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

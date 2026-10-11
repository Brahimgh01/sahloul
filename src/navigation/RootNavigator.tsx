// Root navigator: bottom tabs + a stack for the other screens.
import { DefaultTheme, NavigationContainer, type Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import { TabBar } from '@/navigation/TabBar';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { AboutScreen } from '@/screens/AboutScreen';
import { AssistantScreen } from '@/screens/AssistantScreen';
import { BoardScreen } from '@/screens/BoardScreen';
import { CompaniesScreen } from '@/screens/CompaniesScreen';
import { CompanyScreen } from '@/screens/CompanyScreen';
import { DeviceScreen } from '@/screens/DeviceScreen';
import { DevicesScreen } from '@/screens/DevicesScreen';
import { ImportCsvScreen } from '@/screens/ImportCsvScreen';
import { PaperCheckScreen } from '@/screens/PaperCheckScreen';
import { PaperViewerScreen } from '@/screens/PaperViewerScreen';
import { PapersScreen } from '@/screens/PapersScreen';
import { ReturnScreen } from '@/screens/ReturnScreen';
import { ScanScreen } from '@/screens/ScanScreen';
import { SendScreen } from '@/screens/SendScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { TodayScreen } from '@/screens/TodayScreen';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Devices" component={DevicesScreen} />
      <Tab.Screen name="Companies" component={CompaniesScreen} />
      <Tab.Screen name="Papers" component={PapersScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const theme = useTheme();
  const { t } = useT();

  const navTheme: NavTheme = {
    ...DefaultTheme,
    dark: theme.mode === 'dark',
    colors: {
      ...DefaultTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.bg,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.line,
      notification: theme.colors.late,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerBackTitle: '',
          contentStyle: { backgroundColor: theme.colors.bg },
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Device" component={DeviceScreen} options={{ title: t('devices.title') }} />
        <Stack.Screen name="Company" component={CompanyScreen} options={{ title: t('companies.title') }} />
        <Stack.Screen name="Send" component={SendScreen} options={{ title: t('send.title') }} />
        <Stack.Screen name="Return" component={ReturnScreen} options={{ title: t('returnFlow.title') }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PaperCheck" component={PaperCheckScreen} options={{ title: t('papers.title') }} />
        <Stack.Screen name="PaperViewer" component={PaperViewerScreen} options={{ title: t('papers.title') }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('settings.title') }} />
        <Stack.Screen name="ImportCsv" component={ImportCsvScreen} options={{ title: t('importFlow.title') }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ title: t('about.title') }} />
        <Stack.Screen name="Assistant" component={AssistantScreen} options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="Board" component={BoardScreen} options={{ title: t('board.title') }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

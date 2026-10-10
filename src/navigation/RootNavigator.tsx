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

  const navTheme: NavTheme = {
    ...DefaultTheme,
    dark: theme.mode === 'dark',
    colors: {
      ...DefaultTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.bg,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.late,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.bg },
          headerTintColor: theme.colors.text,
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Device" component={DeviceScreen} />
        <Stack.Screen name="Company" component={CompanyScreen} />
        <Stack.Screen name="Send" component={SendScreen} />
        <Stack.Screen name="Return" component={ReturnScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="PaperCheck" component={PaperCheckScreen} />
        <Stack.Screen name="PaperViewer" component={PaperViewerScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="ImportCsv" component={ImportCsvScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="Assistant" component={AssistantScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Board" component={BoardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// User settings, saved on the phone (works offline).
// Simple zustand store persisted to AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Language } from '@/types';
import type { TextScaleName } from '@/theme/tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

// One entry per alert type (spec section 8).
export type AlertKind =
  | 'device_late'
  | 'critical_waiting'
  | 'due_tomorrow'
  | 'contract_ending'
  | 'done'
  | 'morning'
  | 'sync_problem';

export interface AlertPref {
  enabled: boolean;
  sound: string;
  vibrate: boolean;
  voice: boolean;
}

export type AlertPrefs = Record<AlertKind, AlertPref>;

interface SettingsState {
  language: Language;
  textScale: TextScaleName;
  themeMode: ThemeMode;
  reduceMotion: boolean;
  highContrast: boolean;
  soundsEnabled: boolean;
  hapticsEnabled: boolean;
  assistantEnabled: boolean;
  aiEnabled: boolean;
  cloudSyncEnabled: boolean;
  wifiOnlyUploads: boolean;
  demoLoaded: boolean;

  pinEnabled: boolean;
  autoLockMinutes: number;

  // Which weekdays are the "weekend" for business-day math. 0=Sunday..6=Saturday.
  weekendDays: number[];

  quietHoursEnabled: boolean;
  quietFrom: string; // "20:00"
  quietTo: string; // "07:00"
  criticalBypassQuiet: boolean;

  morningBriefingEnabled: boolean;
  morningBriefingTime: string; // "08:00"

  alerts: AlertPrefs;

  set: (patch: Partial<SettingsState>) => void;
  setAlert: (kind: AlertKind, patch: Partial<AlertPref>) => void;
}

const defaultAlerts: AlertPrefs = {
  device_late: { enabled: true, sound: 'device_late', vibrate: true, voice: true },
  critical_waiting: { enabled: true, sound: 'critical_waiting', vibrate: true, voice: true },
  due_tomorrow: { enabled: true, sound: 'due_tomorrow', vibrate: false, voice: false },
  contract_ending: { enabled: true, sound: 'contract_ending', vibrate: false, voice: false },
  done: { enabled: true, sound: 'done', vibrate: true, voice: false },
  morning: { enabled: true, sound: 'morning', vibrate: false, voice: false },
  sync_problem: { enabled: true, sound: 'sync_problem', vibrate: false, voice: false },
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'fr', // French is the default
      textScale: 'normal',
      themeMode: 'system',
      reduceMotion: false,
      highContrast: false,
      soundsEnabled: true,
      hapticsEnabled: true,
      assistantEnabled: true,
      aiEnabled: true,
      cloudSyncEnabled: true,
      wifiOnlyUploads: true,
      demoLoaded: false,

      pinEnabled: false,
      autoLockMinutes: 5,

      weekendDays: [0, 6], // Saturday + Sunday

      quietHoursEnabled: true,
      quietFrom: '20:00',
      quietTo: '07:00',
      criticalBypassQuiet: true,

      morningBriefingEnabled: true,
      morningBriefingTime: '08:00',

      alerts: defaultAlerts,

      set: (patch) => set(patch as SettingsState),
      setAlert: (kind, patch) =>
        set((s) => ({ alerts: { ...s.alerts, [kind]: { ...s.alerts[kind], ...patch } } })),
    }),
    {
      name: 'sithub-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

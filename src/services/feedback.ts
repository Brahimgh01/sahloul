// Haptics + tiny sounds. Success = light tap, warning = double, critical = strong.
// Sounds are musical chimes, never buzzers (spec section 8).
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { useSettings } from '@/store/settings';

const SOURCES: Record<string, number> = {
  device_late: require('../../assets/sounds/device_late.wav'),
  critical_waiting: require('../../assets/sounds/critical_waiting.wav'),
  due_tomorrow: require('../../assets/sounds/due_tomorrow.wav'),
  contract_ending: require('../../assets/sounds/contract_ending.wav'),
  done: require('../../assets/sounds/done.wav'),
  morning: require('../../assets/sounds/morning.wav'),
  sync_problem: require('../../assets/sounds/sync_problem.wav'),
  success: require('../../assets/sounds/success.wav'),
  error: require('../../assets/sounds/error.wav'),
};

const players: Record<string, AudioPlayer> = {};

function getPlayer(name: string): AudioPlayer | null {
  try {
    if (!players[name]) {
      const src = SOURCES[name];
      if (!src) return null;
      players[name] = createAudioPlayer(src);
    }
    return players[name];
  } catch {
    return null; // never let a sound crash the app
  }
}

export function playSound(name: keyof typeof SOURCES | string) {
  if (!useSettings.getState().soundsEnabled) return;
  const p = getPlayer(name);
  try {
    p?.seekTo(0);
    p?.play();
  } catch {
    /* ignore */
  }
}

export type HapticKind = 'light' | 'success' | 'warning' | 'critical' | 'select';

export function haptic(kind: HapticKind) {
  if (!useSettings.getState().hapticsEnabled) return;
  try {
    switch (kind) {
      case 'light':
      case 'select':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'critical':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
    }
  } catch {
    /* ignore */
  }
}

export function success() {
  haptic('success');
  playSound('success');
}

export function error() {
  haptic('warning');
  playSound('error');
}

// Local notifications: one Android channel per alert type, each with its own sound.
// Scheduled on the phone, so reminders work with no internet (spec section 8).
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { useSettings, type AlertKind } from '@/store/settings';

// Channel id + sound file per alert type.
const CHANNELS: Record<AlertKind, { id: string; name: string; desc: string; sound: string }> = {
  device_late: { id: 'device_late', name: 'Device late', desc: 'A device passed its return date', sound: 'device_late.wav' },
  critical_waiting: { id: 'critical_waiting', name: 'Critical place waiting', desc: 'Emergency, ICU or Operating Room is waiting', sound: 'critical_waiting.wav' },
  due_tomorrow: { id: 'due_tomorrow', name: 'Due tomorrow', desc: 'A device should come back tomorrow', sound: 'due_tomorrow.wav' },
  contract_ending: { id: 'contract_ending', name: 'Contract ending', desc: 'A contract ends in 30 days', sound: 'contract_ending.wav' },
  done: { id: 'done', name: 'Done', desc: 'Returned, saved or uploaded', sound: 'done.wav' },
  morning: { id: 'morning', name: 'Morning briefing', desc: 'A short daily summary', sound: 'morning.wav' },
  sync_problem: { id: 'sync_problem', name: 'Sync problem', desc: 'Uploads keep failing', sound: 'sync_problem.wav' },
};

export async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  for (const key of Object.keys(CHANNELS) as AlertKind[]) {
    const c = CHANNELS[key];
    try {
      await Notifications.setNotificationChannelAsync(c.id, {
        name: c.name,
        description: c.desc,
        importance: key === 'critical_waiting' ? Notifications.AndroidImportance.HIGH : Notifications.AndroidImportance.DEFAULT,
        sound: c.sound,
        vibrationPattern: key === 'critical_waiting' ? [0, 250, 150, 250] : [0, 150],
        enableVibrate: useSettings.getState().alerts[key].vibrate,
      });
    } catch {
      /* ignore */
    }
  }
}

export async function setupNotifications() {
  try {
    const settings = useSettings.getState();
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      await Notifications.requestPermissionsAsync();
    }
    await ensureChannels();
    if (settings.morningBriefingEnabled) await scheduleMorningBriefing();
  } catch {
    /* notifications are a bonus; never crash */
  }
}

function soundFor(kind: AlertKind): string | null {
  const pref = useSettings.getState().alerts[kind];
  if (!pref.enabled) return null;
  // A 24-hour "silent" fallback: the channel still shows, just quieter.
  return CHANNELS[kind].sound;
}

/** Schedule reminders for a trip. Works offline. */
export async function scheduleTripReminders(opts: {
  tripId: string;
  deviceLabel: string;
  companyName: string;
  expectedReturn: string; // YYYY-MM-DD
  critical: boolean;
  language: string;
}) {
  try {
    const prefs = useSettings.getState().alerts;
    const expected = new Date(opts.expectedReturn);

    // Due tomorrow: 1 day before at 09:00.
    if (prefs.due_tomorrow.enabled) {
      const due = new Date(expected);
      due.setDate(due.getDate() - 1);
      due.setHours(9, 0, 0, 0);
      if (due.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'S-IT Hub',
            body: `${opts.deviceLabel} — ${opts.companyName}`,
            sound: soundFor('due_tomorrow') ?? undefined,
            data: { tripId: opts.tripId, kind: 'due_tomorrow' },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: due, channelId: 'due_tomorrow' } as never,
        });
      }
    }

    // Device late: the day after the expected date, then daily.
    const lateAt = new Date(expected);
    lateAt.setDate(lateAt.getDate() + 1);
    lateAt.setHours(9, 0, 0, 0);
    const lateTrigger =
      lateAt.getTime() > Date.now()
        ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: lateAt, channelId: 'device_late' }
        : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0, channelId: 'device_late' };
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'S-IT Hub',
        body: `${opts.deviceLabel} — ${opts.companyName}`,
        sound: soundFor('device_late') ?? undefined,
        data: { tripId: opts.tripId, kind: 'device_late', repeats: true },
      },
      trigger: lateTrigger as never,
    });

    // Critical place: up to 3 chimes, 10 minutes apart, starting now-ish at 09:00.
    if (opts.critical && prefs.critical_waiting.enabled) {
      const base = new Date(expected);
      base.setHours(9, 0, 0, 0);
      for (let i = 0; i < 3; i++) {
        const when = new Date(base.getTime() + i * 10 * 60 * 1000);
        if (when.getTime() < Date.now()) continue;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'S-IT Hub',
            body: `${opts.deviceLabel}`,
            sound: soundFor('critical_waiting') ?? undefined,
            data: { tripId: opts.tripId, kind: 'critical_waiting' },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: 'critical_waiting' } as never,
        });
      }
    }
  } catch {
    /* ignore */
  }
}

/** Cancel all reminders for a trip (when a device comes back). */
export async function cancelTripReminders(tripId: string) {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      const data = n.content.data as { tripId?: string };
      if (data?.tripId === tripId) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {
    /* ignore */
  }
}

export async function scheduleMorningBriefing() {
  try {
    const settings = useSettings.getState();
    const [h, m] = settings.morningBriefingTime.split(':').map((x) => parseInt(x, 10));
    // Cancel an old one first.
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      const data = n.content.data as { kind?: string };
      if (data?.kind === 'morning') await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if (!settings.morningBriefingEnabled) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'S-IT Hub',
        body: 'S-IT Hub',
        sound: soundFor('morning') ?? undefined,
        data: { kind: 'morning' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h || 8, minute: m || 0, channelId: 'morning' } as never,
    });
  } catch {
    /* ignore */
  }
}

/** "Test this sound" button in Settings. */
export async function testSound(kind: AlertKind) {
  try {
    await ensureChannels();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'S-IT Hub',
        body: CHANNELS[kind].name,
        sound: CHANNELS[kind].sound,
        data: { kind },
      },
      trigger: null, // immediately
    });
  } catch {
    /* ignore */
  }
}

/** Notification action buttons: Open / Snooze until tomorrow. */
export const NOTIFICATION_CATEGORY = 'device_alert';

export async function registerCategories() {
  try {
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY, [
      { identifier: 'open', buttonTitle: 'Ouvrir' },
      { identifier: 'snooze', buttonTitle: 'Demain' },
    ]);
  } catch {
    /* ignore */
  }
}

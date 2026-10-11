// Browser variant of the notification service. Everything is a safe no-op so
// the design preview never crashes; the phone build uses notifications.ts.
import type { AlertKind } from '@/store/settings';

export async function ensureChannels() {
  /* no push channels in the browser */
}

export async function setupNotifications() {
  /* no-op */
}

export async function scheduleTripReminders(_opts: {
  tripId: string;
  deviceLabel: string;
  companyName: string;
  expectedReturn: string;
  critical: boolean;
  language: string;
}) {
  /* no-op */
}

export async function cancelTripReminders(_tripId: string) {
  /* no-op */
}

export async function scheduleMorningBriefing() {
  /* no-op */
}

export async function testSound(_kind: AlertKind) {
  /* no-op */
}

export const NOTIFICATION_CATEGORY = 'device_alert';

export async function registerCategories() {
  /* no-op */
}

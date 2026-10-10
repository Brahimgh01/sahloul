// Status metadata: every status has an icon and a color (never color alone).
import type { IconName } from '@/components/ui';
import type { Palette } from '@/theme/tokens';
import type { DeviceStatus, PaperType, TripResult } from '@/types';

export interface StatusMeta {
  i18nKey: string; // key in i18n -> statuses.*
  icon: IconName;
  colorKey: keyof Palette;
}

export const DEVICE_STATUS: Record<DeviceStatus, StatusMeta> = {
  in_office: { i18nKey: 'statuses.in_office', icon: 'office-building', colorKey: 'info' },
  at_company: { i18nKey: 'statuses.at_company', icon: 'factory', colorKey: 'info' },
  ready_for_pickup: { i18nKey: 'statuses.ready_for_pickup', icon: 'package-variant', colorKey: 'due' },
  back_in_service: { i18nKey: 'statuses.back_in_service', icon: 'check-circle', colorKey: 'done' },
  retired: { i18nKey: 'statuses.retired', icon: 'archive', colorKey: 'textFaint' },
};

export const TRIP_RESULT: Record<TripResult, StatusMeta> = {
  repaired: { i18nKey: 'returnFlow.repaired', icon: 'check-circle', colorKey: 'done' },
  not_repaired: { i18nKey: 'returnFlow.notRepaired', icon: 'close-circle', colorKey: 'late' },
  replaced: { i18nKey: 'returnFlow.replaced', icon: 'swap-horizontal', colorKey: 'info' },
};

export const PAPER_TYPE_META: Record<PaperType, { i18nKey: string; icon: IconName }> = {
  invoice: { i18nKey: 'paperTypes.invoice', icon: 'file-document' },
  contract: { i18nKey: 'paperTypes.contract', icon: 'file-sign' },
  quote: { i18nKey: 'paperTypes.quote', icon: 'file-percent' },
  dispatch_note: { i18nKey: 'paperTypes.dispatch_note', icon: 'truck-fast' },
  reception_sheet: { i18nKey: 'paperTypes.reception_sheet', icon: 'clipboard-check' },
  warranty: { i18nKey: 'paperTypes.warranty', icon: 'shield-check' },
  other: { i18nKey: 'paperTypes.other', icon: 'file' },
};

// Device-type icons for the list.
export function deviceIcon(type: string): IconName {
  const t = (type || '').toLowerCase();
  if (t.includes('print')) return 'printer';
  if (t.includes('scan')) return 'scanner';
  if (t.includes('monitor') || t.includes('écran') || t.includes('ecran')) return 'monitor';
  if (t.includes('pc') || t.includes('computer') || t.includes('ordinateur')) return 'desktop-classic';
  return 'devices';
}

// Departments that are always "critical" (spec 13).
export const CRITICAL_DEPARTMENTS = ['Emergency', 'ICU', 'Operating Room'];

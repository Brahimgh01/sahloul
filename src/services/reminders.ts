// Write a reminder message for a company and open WhatsApp or email with it filled in.
// Uses wa.me and mailto links - no paid service (spec 5.6).
import { Linking } from 'react-native';

import { i18n } from '@/i18n';
import type { Company, Language } from '@/types';

export interface ReminderDevice {
  inventory_no: string;
  type: string;
  days_late: number;
}

export function buildReminderMessage(language: Language, companyName: string, devices: ReminderDevice[]): string {
  const t = (k: string) => i18n.t(k, { locale: language });
  const lines = devices.map((d) => `• ${d.inventory_no} — ${d.type} (${d.days_late} j)`);
  return [`${t('reminder.greeting')} ${companyName},`, '', t('reminder.body'), ...lines, '', t('reminder.thanks')].join('\n');
}

export function whatsappUrl(company: Pick<Company, 'phone' | 'whatsapp'>, message: string): string | null {
  const raw = company.whatsapp || company.phone;
  if (!raw) return null;
  const num = raw.replace(/[^0-9]/g, '');
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function mailtoUrl(company: Pick<Company, 'email'>, subject: string, message: string): string | null {
  if (!company.email) return null;
  return `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

export async function openReminder(
  company: Company,
  devices: ReminderDevice[],
  language: Language,
): Promise<boolean> {
  const message = buildReminderMessage(language, company.name, devices);
  const wa = whatsappUrl(company, message);
  if (wa) {
    try {
      const ok = await Linking.canOpenURL(wa);
      if (ok) {
        await Linking.openURL(wa);
        return true;
      }
    } catch {
      /* fall through to email */
    }
  }
  const mail = mailtoUrl(company, i18n.t('reminder.subject', { locale: language }), message);
  if (mail) {
    try {
      await Linking.openURL(mail);
      return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

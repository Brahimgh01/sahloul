// Browser variant of the paper printing: opens a new window with the same HTML
// and calls the browser print dialog. No file system, no sharing plugin.
import type { Company, Device, Language, Trip } from '@/types';

import { buildDispatchHtml, buildReceptionHtml } from './pdfTemplates';

type AnyDevice = Pick<Device, 'type' | 'brand' | 'inventory_no' | 'serial_no' | 'department'>;

export { buildDispatchHtml, buildReceptionHtml };

function openPrintWindow(html: string) {
  try {
    const win = globalThis.open?.('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
    }
  } catch {
    /* ignore */
  }
}

export async function printDispatchNote(devices: AnyDevice[], company: Company | null, language: Language) {
  openPrintWindow(buildDispatchHtml(devices, company, language));
}

export async function printReceptionSheet(trip: Trip, device: AnyDevice, company: Company | null, language: Language) {
  openPrintWindow(buildReceptionHtml(trip, device, company, language));
}

export async function writePdf(html: string): Promise<string> {
  openPrintWindow(html);
  return '';
}

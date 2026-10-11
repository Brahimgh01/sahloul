// Printing the app's papers on a phone: expo-print opens the system print
// dialog (which can also save as PDF) and expo-sharing hands the PDF to another
// app. The HTML itself comes from pdfTemplates.ts (shared with the browser).
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { Company, Device, Language, Trip } from '@/types';

import { buildDispatchHtml, buildReceptionHtml } from './pdfTemplates';

type AnyDevice = Pick<Device, 'type' | 'brand' | 'inventory_no' | 'serial_no' | 'department'>;

export { buildDispatchHtml, buildReceptionHtml };

/** Open the system print dialog (can also save as PDF). */
export async function printDispatchNote(devices: AnyDevice[], company: Company | null, language: Language) {
  try {
    await Print.printAsync({ html: buildDispatchHtml(devices, company, language) });
  } catch {
    /* user closed the dialog */
  }
}

export async function printReceptionSheet(trip: Trip, device: AnyDevice, company: Company | null, language: Language) {
  try {
    const { uri } = await Print.printToFileAsync({ html: buildReceptionHtml(trip, device, company, language) });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    else await Print.printAsync({ html: buildReceptionHtml(trip, device, company, language) });
  } catch {
    /* ignore */
  }
}

/** Save a PDF to a local file (used when a paper is stored). */
export async function writePdf(html: string): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

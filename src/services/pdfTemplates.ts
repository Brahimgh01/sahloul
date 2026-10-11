// Pure HTML builders for the papers made by the app (dispatch note and
// reception sheet). Kept separate from printing so they work on every platform.
import { i18n } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { formatTND } from '@/lib/money';
import type { Company, Device, Language, Trip } from '@/types';

type AnyDevice = Pick<Device, 'type' | 'brand' | 'inventory_no' | 'serial_no' | 'department'>;

function t(language: Language, key: string) {
  return i18n.t(key, { locale: language });
}

function esc(v: unknown) {
  return String(v ?? '—').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
}

function page(title: string, language: Language, body: string) {
  const rtl = language === 'ar';
  return `<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8" />
  <style>
    * { font-family: -apple-system, "Noto Sans Arabic", "Segoe UI", Roboto, sans-serif; }
    body { padding: 32px; color: #0F1B2D; }
    h1 { font-size: 22px; margin: 0 0 4px; color: #0B3C74; }
    .sub { color: #5A6B82; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #DDE6F0; padding: 8px; font-size: 13px; text-align: start; }
    th { background: #EFF4FA; }
    .meta { display:flex; justify-content: space-between; margin-top: 18px; font-size: 13px; }
    .boxes { display: flex; gap: 24px; margin-top: 42px; }
    .box { flex: 1; height: 110px; border: 1px dashed #93A2B6; border-radius: 8px; padding: 8px; color:#93A2B6; font-size: 12px; }
    .foot { margin-top: 24px; font-size: 11px; color: #93A2B6; }
  </style></head><body>
  <h1>${esc(title)}</h1>
  <div class="sub">S-IT Hub</div>
  ${body}
  <div class="boxes">
    <div class="box">${esc(t(language, 'doc.signature'))}</div>
    <div class="box">${esc(t(language, 'doc.stamp'))}</div>
  </div>
  <div class="foot">${esc(t(language, 'common.noPatientNames'))}</div>
  </body></html>`;
}

function devicesTable(devices: AnyDevice[], language: Language) {
  const head = [
    t(language, 'doc.type'),
    t(language, 'doc.inventory'),
    t(language, 'doc.serial'),
    t(language, 'doc.department'),
  ];
  const rows = devices
    .map(
      (d) =>
        `<tr><td>${esc(d.type)} ${esc(d.brand)}</td><td>${esc(d.inventory_no)}</td><td>${esc(d.serial_no)}</td><td>${esc(d.department)}</td></tr>`,
    )
    .join('');
  return `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function buildDispatchHtml(devices: AnyDevice[], company: Company | null, language: Language, sentDate?: string): string {
  const meta = `<div class="meta">
    <div><b>${esc(t(language, 'doc.company'))}:</b> ${esc(company?.name)}</div>
    <div><b>${esc(t(language, 'doc.sentDate'))}:</b> ${esc(formatDate(sentDate ?? new Date().toISOString()))}</div>
    <div><b>${esc(t(language, 'doc.deviceCount'))}:</b> ${devices.length}</div>
  </div>`;
  return page(t(language, 'doc.dispatchTitle'), language, meta + devicesTable(devices, language));
}

export function buildReceptionHtml(trip: Trip, device: AnyDevice, company: Company | null, language: Language): string {
  const meta = `<div class="meta">
    <div><b>${esc(t(language, 'doc.company'))}:</b> ${esc(company?.name)}</div>
    <div><b>${esc(t(language, 'doc.returnedDate'))}:</b> ${esc(formatDate(trip.returned_date))}</div>
    <div><b>${esc(t(language, 'doc.cost'))}:</b> ${esc(formatTND(trip.cost))}</div>
  </div>`;
  const problem = `<p><b>${esc(t(language, 'doc.problem'))}:</b> ${esc(trip.problem)}</p>`;
  return page(t(language, 'doc.receptionTitle'), language, meta + problem + devicesTable([device], language));
}

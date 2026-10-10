// Tunisian dinar, 3 decimals (1 TND = 1000 millimes).
export function formatTND(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(3)} TND`;
}

export function parseTND(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,]/g, '').replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

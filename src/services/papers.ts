// Files for papers: saved on the phone first, uploaded later (spec 9).
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';

export function papersDir(): string {
  return `${FileSystem.documentDirectory}papers/`;
}

export async function ensurePapersDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(papersDir());
    if (!info.exists) await FileSystem.makeDirectoryAsync(papersDir(), { intermediates: true });
  } catch {
    /* ignore */
  }
}

function imagesToHtml(uris: string[]): string {
  const pages = uris
    .map(
      (u) =>
        `<div style="page-break-after: always; text-align:center;"><img src="${u}" style="max-width:100%; max-height:96vh;" /></div>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:0">${pages}</body></html>`;
}

/** Several pages -> ONE PDF. */
export async function saveImagesAsPdf(imageUris: string[], fileName: string): Promise<string> {
  await ensurePapersDir();
  const { uri } = await Print.printToFileAsync({ html: imagesToHtml(imageUris) });
  const dest = `${papersDir()}${fileName}`;
  try {
    await FileSystem.moveAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

export async function deleteFile(path: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {
    /* ignore */
  }
}

export async function fileSize(path: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists && 'size' in info ? (info.size ?? 0) : 0;
  } catch {
    return 0;
  }
}

/** Total storage used by papers, in a friendly string. */
export async function storageUsed(): Promise<string> {
  try {
    const files = await FileSystem.readDirectoryAsync(papersDir());
    let total = 0;
    for (const f of files) total += await fileSize(`${papersDir()}${f}`);
    if (total < 1024) return `${total} B`;
    if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`;
    return `${(total / 1024 / 1024).toFixed(1)} MB`;
  } catch {
    return '0 B';
  }
}

/** File name per spec: YYYY-MM-DD_Type_Company_Inventory.pdf */
export function paperFileName(date: string, type: string, company: string, inventory: string): string {
  const safe = (s: string) => (s || '').replace(/[^A-Za-z0-9\-_.]+/g, '').slice(0, 24) || 'NA';
  return `${date}_${safe(type)}_${safe(company)}_${safe(inventory)}.pdf`;
}

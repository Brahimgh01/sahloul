// Browser variant of the papers/file service. No real file system in the
// browser, so the design preview keeps everything in memory.

export function papersDir(): string {
  return '';
}

export async function ensurePapersDir(): Promise<void> {
  /* no-op */
}

export async function saveImagesAsPdf(imageUris: string[], _fileName: string): Promise<string> {
  // Keep the first image uri so a preview still has something to show.
  return imageUris[0] ?? '';
}

export async function deleteFile(_path: string): Promise<void> {
  /* no-op */
}

export async function fileSize(_path: string): Promise<number> {
  return 0;
}

export async function storageUsed(): Promise<string> {
  return '0 B';
}

export async function readTextFile(uri: string): Promise<string> {
  try {
    const res = await fetch(uri);
    return await res.text();
  } catch {
    return '';
  }
}

export async function exists(path: string): Promise<boolean> {
  return !!path && /^(https?:|data:|blob:)/.test(path);
}

export async function shareFile(path: string, mime: string): Promise<boolean> {
  try {
    const nav = globalThis.navigator as Navigator & {
      canShare?: (data: unknown) => boolean;
      share?: (data: unknown) => Promise<void>;
    };
    void mime;
    if (nav?.share && (!nav.canShare || nav.canShare({ url: path }))) {
      await nav.share({ url: path });
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export async function printFile(path: string): Promise<void> {
  try {
    globalThis.open?.(path, '_blank');
  } catch {
    /* ignore */
  }
}

/** File name per spec: YYYY-MM-DD_Type_Company_Inventory.pdf */
export function paperFileName(date: string, type: string, company: string, inventory: string): string {
  const safe = (s: string) => (s || '').replace(/[^A-Za-z0-9\-_.]+/g, '').slice(0, 24) || 'NA';
  return `${date}_${safe(type)}_${safe(company)}_${safe(inventory)}.pdf`;
}

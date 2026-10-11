// Browser variant of the document scanner (Google ML Kit / VisionKit are
// native only). Returns "cancelled" so the scan screen stays usable.
export interface ScanResult {
  images: string[]; // file:// uris, one per page
  cancelled: boolean;
}

export async function scanDocument(_maxPages = 10): Promise<ScanResult> {
  return { images: [], cancelled: true };
}

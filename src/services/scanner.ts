// Document scanner wrapper. On Android it uses Google ML Kit Document Scanner:
// it finds the page, straightens it, and lets her crop / reorder pages.
// On iOS it uses VisionKit. If a device behaves badly, we surface the error so
// another package can be chosen (spec section 3 / 6).
import DocumentScanner from 'react-native-document-scanner-plugin';

export interface ScanResult {
  images: string[]; // file:// uris, one per page
  cancelled: boolean;
}

export async function scanDocument(maxPages = 10): Promise<ScanResult> {
  try {
    const res = await DocumentScanner.scanDocument({
      maxNumDocuments: maxPages,
    });
    const images = res.scannedImages ?? [];
    return { images, cancelled: images.length === 0 };
  } catch (e) {
    // Common cause: Google Play services missing on the phone.
    console.warn('scanDocument failed', e);
    return { images: [], cancelled: true };
  }
}

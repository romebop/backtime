// Sync orchestrator — coordinates Gmail fetch + Gemini parsing
// Runs entirely in the browser

import { fetchAndParseEmails } from './gmail';
import { parseEmailWithGemini, type ParsedPurchase } from './gemini';
import { buildMerchantQuery, buildIncrementalQuery } from './merchants';

export interface SyncCallbacks {
  // Get a Gemini OAuth token from our server (only thing that touches our infra)
  getGeminiToken: () => Promise<string>;
  // Save a parsed purchase to the database
  savePurchase: (purchase: ParsedPurchase, emailId: string) => Promise<void>;
  // Get the last sync timestamp
  getLastSyncedAt: () => Promise<string | null>;
  // Update the last sync timestamp
  setLastSyncedAt: (timestamp: string) => Promise<void>;
  // Called when Gemini extracts a purchase (before saving)
  onPurchaseExtracted?: (purchase: ParsedPurchase, emailId: string) => void;
  // Called after a purchase is saved successfully
  onPurchaseSaved?: (emailId: string) => void;
  // Called when a purchase fails to save
  onPurchaseFailed?: (emailId: string) => void;
  // Progress callback
  onProgress?: (current: number, total: number, itemName?: string) => void;
}

export const runSync = async (
  gmailAccessToken: string,
  callbacks: SyncCallbacks,
): Promise<{ synced: number; errors: number }> => {
  const { getGeminiToken, savePurchase, getLastSyncedAt, setLastSyncedAt, onPurchaseExtracted, onPurchaseSaved, onPurchaseFailed, onProgress } = callbacks;

  // Build query — incremental if we have a previous sync timestamp
  const lastSyncedAt = await getLastSyncedAt();
  let query: string;
  if (lastSyncedAt) {
    // Format as YYYY/MM/DD for Gmail's after: operator
    const date = new Date(lastSyncedAt);
    const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    query = buildIncrementalQuery(dateStr);
  } else {
    query = buildMerchantQuery();
  }

  // Fetch emails from Gmail (happens in browser)
  console.log('[sync] Gmail query:', query);
  const emails = await fetchAndParseEmails(gmailAccessToken, query);
  console.log('[sync] found', emails.length, 'emails to consider:');
  emails.forEach((e, i) => console.log(`  [${i + 1}] From: ${e.from} | Subject: ${e.subject}`));

  if (emails.length === 0) {
    await setLastSyncedAt(new Date().toISOString());
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;

  // Get one token for the entire sync (valid for 5 minutes)
  const geminiToken = await getGeminiToken();

  // Parse each email with Gemini (browser → Google directly)
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    onProgress?.(i + 1, emails.length);

    try {
      const purchase = await parseEmailWithGemini(geminiToken, email);

      if (purchase) {
        console.log(`[sync] ✓ purchase extracted from "${email.subject}":`, {
          name: purchase.name,
          merchant: purchase.merchant,
          price: purchase.price,
          purchaseDate: purchase.purchaseDate,
          returnByDate: purchase.returnByDate,
          orderNumber: purchase.orderNumber,
        });
        onPurchaseExtracted?.(purchase, email.messageId);
        try {
          await savePurchase(purchase, email.messageId);
          onPurchaseSaved?.(email.messageId);
        } catch (saveErr) {
          console.error(`[sync] save failed for "${email.subject}":`, saveErr);
          onPurchaseFailed?.(email.messageId);
        }
        onProgress?.(i + 1, emails.length, purchase.name);
        synced++;
      } else {
        console.log(`[sync] ✗ not a purchase: "${email.subject}"`);
      }
    } catch (err) {
      console.error(`Failed to process email "${email.subject}":`, err);
      errors++;
    }
  }

  await setLastSyncedAt(new Date().toISOString());
  return { synced, errors };
};

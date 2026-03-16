// Sync orchestrator — coordinates Gmail fetch + Gemini parsing
// Runs entirely in the browser

import { fetchAndParseEmails } from './gmail';
import { parseEmailWithGemini, type ParsedPurchase } from './gemini';
import { buildMerchantQuery, buildIncrementalQuery } from './merchants';

export interface SyncCallbacks {
  // Get an ephemeral Gemini token from our server (only thing that touches our infra)
  getEphemeralToken: () => Promise<string>;
  // Save a parsed purchase to the database
  savePurchase: (purchase: ParsedPurchase, emailId: string) => Promise<void>;
  // Get the last sync timestamp
  getLastSyncedAt: () => Promise<string | null>;
  // Update the last sync timestamp
  setLastSyncedAt: (timestamp: string) => Promise<void>;
  // Progress callback
  onProgress?: (current: number, total: number, itemName?: string) => void;
}

export const runSync = async (
  gmailAccessToken: string,
  callbacks: SyncCallbacks,
): Promise<{ synced: number; errors: number }> => {
  const { getEphemeralToken, savePurchase, getLastSyncedAt, setLastSyncedAt, onProgress } = callbacks;

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
  console.log('[sync] found', emails.length, 'emails');

  if (emails.length === 0) {
    await setLastSyncedAt(new Date().toISOString());
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;

  // Parse each email with Gemini (browser → Google directly via ephemeral token)
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    onProgress?.(i + 1, emails.length);

    try {
      // Get a fresh ephemeral token for each email
      // (tokens are single-use for security)
      const token = await getEphemeralToken();
      const purchase = await parseEmailWithGemini(token, email);

      if (purchase) {
        await savePurchase(purchase, email.messageId);
        onProgress?.(i + 1, emails.length, purchase.name);
        synced++;
      }
    } catch (err) {
      console.error(`Failed to process email "${email.subject}":`, err);
      errors++;
    }
  }

  await setLastSyncedAt(new Date().toISOString());
  return { synced, errors };
};

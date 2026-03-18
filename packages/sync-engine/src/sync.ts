// Sync orchestrator — coordinates Gmail fetch + Gemini parsing
// Runs entirely in the browser

import { fetchAndParseEmails, fetchAndParseMessageIds, getProfileHistoryId, getNewMessageIds } from './gmail';
import { parseEmailWithGemini, type ParsedPurchase } from './gemini';
import { buildMerchantQuery, buildIncrementalQuery } from './merchants';

export interface SyncCallbacks {
  // Get a Gemini OAuth token from our server (only thing that touches our infra)
  getGeminiToken: () => Promise<string>;
  // Save a parsed purchase to the database
  savePurchase: (purchase: ParsedPurchase, emailId: string) => Promise<void>;
  // Get the last sync state (historyId + timestamp)
  getLastSyncedAt: () => Promise<string | null>;
  setLastSyncedAt: (timestamp: string) => Promise<void>;
  getHistoryId: () => Promise<string | null>;
  setHistoryId: (historyId: string) => Promise<void>;
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
  const { getGeminiToken, savePurchase, getLastSyncedAt, setLastSyncedAt, getHistoryId, setHistoryId, onPurchaseExtracted, onPurchaseSaved, onPurchaseFailed, onProgress } = callbacks;

  // Try incremental sync: historyId → date-based → full scan
  const savedHistoryId = await getHistoryId();
  const lastSyncedAt = await getLastSyncedAt();
  let emails;

  if (savedHistoryId) {
    try {
      console.log('[sync] incremental sync using historyId:', savedHistoryId);
      const newMessageIds = await getNewMessageIds(gmailAccessToken, savedHistoryId);
      console.log('[sync] history API returned', newMessageIds.length, 'new messages');
      emails = await fetchAndParseMessageIds(gmailAccessToken, newMessageIds);
    } catch (err: any) {
      // historyId expired (404) or other error — fall back to date-based
      console.warn('[sync] history API failed:', err.message);
      if (lastSyncedAt) {
        const date = new Date(lastSyncedAt);
        const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
        const query = buildIncrementalQuery(dateStr);
        console.log('[sync] falling back to date-based query:', query);
        emails = await fetchAndParseEmails(gmailAccessToken, query);
      } else {
        const query = buildMerchantQuery();
        console.log('[sync] falling back to full scan:', query);
        emails = await fetchAndParseEmails(gmailAccessToken, query);
      }
    }
  } else if (lastSyncedAt) {
    // Have a timestamp but no historyId (e.g. migrated from old sync) — date-based
    const date = new Date(lastSyncedAt);
    const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    const query = buildIncrementalQuery(dateStr);
    console.log('[sync] date-based sync:', query);
    emails = await fetchAndParseEmails(gmailAccessToken, query);
  } else {
    // First sync — full merchant scan
    const query = buildMerchantQuery();
    console.log('[sync] first sync, Gmail query:', query);
    emails = await fetchAndParseEmails(gmailAccessToken, query);
  }

  console.log('[sync] found', emails.length, 'emails to consider:');
  emails.forEach((e, i) => console.log(`  [${i + 1}] From: ${e.from} | Subject: ${e.subject}`));

  // Save current historyId for next incremental sync
  const currentHistoryId = await getProfileHistoryId(gmailAccessToken);
  await setHistoryId(currentHistoryId);

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
        await new Promise(r => setTimeout(r, 2000)); // TODO: remove — artificial delay for pending indicator
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

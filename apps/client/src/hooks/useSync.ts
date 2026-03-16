import { useState, useCallback, useRef } from 'react';

import { runSync, type SyncCallbacks, type ParsedPurchase } from '@backtime/sync-engine';
import { getGmailToken } from '../lib/google';
import { supabase } from '../lib/supabase';

export interface PendingItem {
  tempId: string;
  name: string;
  merchant: string;
  price: number | null;
  purchase_date: string | null;
  return_by_date: string | null;
  warranty_end_date: string | null;
  order_number: string | null;
  status: 'pending' | 'saved' | 'error';
}

interface SyncState {
  isSyncing: boolean;
  progress: { current: number; total: number; itemName?: string } | null;
  result: { synced: number; errors: number } | null;
  error: string | null;
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-token`;

export const useSync = (userId: string) => {
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    progress: null,
    result: null,
    error: null,
  });
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const pendingRef = useRef(pendingItems);
  pendingRef.current = pendingItems;

  const startSync = useCallback(async () => {
    const gmailToken = getGmailToken();
    if (!gmailToken) {
      setSyncState(prev => ({ ...prev, error: 'Gmail not connected' }));
      return;
    }

    setSyncState({ isSyncing: true, progress: null, result: null, error: null });
    setPendingItems([]);

    const callbacks: SyncCallbacks = {
      getGeminiToken: async () => {
        console.log('[token] requesting OAuth token from edge function...');
        const start = performance.now();
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        });
        if (!res.ok) {
          const body = await res.text();
          console.error('[token] error:', res.status, body);
          throw new Error('Failed to get ephemeral token');
        }
        const { token } = await res.json();
        console.log(`[token] received in ${Math.round(performance.now() - start)}ms`);
        return token;
      },

      onPurchaseExtracted: (purchase: ParsedPurchase, emailId: string) => {
        setPendingItems(prev => [...prev, {
          tempId: emailId,
          name: purchase.name,
          merchant: purchase.merchant,
          price: purchase.price,
          purchase_date: purchase.purchaseDate,
          return_by_date: purchase.returnByDate,
          warranty_end_date: purchase.warrantyEndDate,
          order_number: purchase.orderNumber,
          status: 'pending',
        }]);
      },

      onPurchaseSaved: (emailId: string) => {
        setPendingItems(prev =>
          prev.map(item => item.tempId === emailId ? { ...item, status: 'saved' as const } : item)
        );
      },

      onPurchaseFailed: (emailId: string) => {
        setPendingItems(prev =>
          prev.map(item => item.tempId === emailId ? { ...item, status: 'error' as const } : item)
        );
      },

      savePurchase: async (purchase: ParsedPurchase, emailId: string) => {
        const { error } = await supabase.from('items').insert({
          user_id: userId,
          name: purchase.name,
          merchant: purchase.merchant,
          price: purchase.price,
          purchase_date: purchase.purchaseDate,
          return_by_date: purchase.returnByDate,
          warranty_end_date: purchase.warrantyEndDate,
          order_number: purchase.orderNumber,
          email_id: emailId,
          source: 'email_scan',
          status: 'active',
        });
        if (error && error.code !== '23505') {
          console.error('[sync] save error:', error);
          throw error;
        }
      },

      getLastSyncedAt: async () => {
        const { data } = await supabase
          .from('sync_state')
          .select('last_synced_at')
          .eq('user_id', userId)
          .maybeSingle();
        return data?.last_synced_at ?? null;
      },

      setLastSyncedAt: async (timestamp: string) => {
        await supabase.from('sync_state').upsert({
          user_id: userId,
          last_synced_at: timestamp,
        });
      },

      onProgress: (current, total, itemName) => {
        setSyncState(prev => ({
          ...prev,
          progress: { current, total, itemName },
        }));
      },
    };

    try {
      const result = await runSync(gmailToken, callbacks);
      setSyncState({ isSyncing: false, progress: null, result, error: null });
    } catch (err) {
      setSyncState({
        isSyncing: false,
        progress: null,
        result: null,
        error: err instanceof Error ? err.message : 'Sync failed',
      });
    }
  }, [userId]);

  return { ...syncState, pendingItems, startSync };
};

export interface PurchasedItem {
  id: string;
  user_id: string;
  name: string;
  merchant: string | null;
  price: number | null;
  purchase_date: string | null;
  return_by_date: string | null;
  warranty_end_date: string | null;
  status: 'active' | 'return_eligible' | 'warranty_only' | 'expired';
  source: 'email_scan' | 'manual' | 'chrome_extension';
  order_number: string | null;
  email_id: string | null;
  return_policy: { days_total: number; conditions: string; return_url?: string } | null;
  created_at: string;
}

export interface SyncState {
  user_id: string;
  last_synced_at: string | null;
  gmail_history_id: string | null;
}

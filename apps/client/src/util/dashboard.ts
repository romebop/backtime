import { PurchasedItem } from '@backtime/types';

export type CategoryId = 'clothing' | 'electronics' | 'beauty' | 'home' | 'sports' | 'other';

export interface Category {
  id: CategoryId;
  label: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'clothing',    label: 'Clothing',    color: '#ec4899' },
  { id: 'electronics', label: 'Electronics', color: '#3b82f6' },
  { id: 'beauty',      label: 'Beauty',      color: '#a855f7' },
  { id: 'home',        label: 'Home',        color: '#f59e0b' },
  { id: 'sports',      label: 'Sports',      color: '#10b981' },
  { id: 'other',       label: 'Other',       color: '#71717a' },
];

const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c])) as Record<CategoryId, Category>;

export const getCategory = (id: CategoryId): Category => CATEGORY_BY_ID[id] ?? CATEGORY_BY_ID.other;

// Schema doesn't have product_category yet (Phase 1 to-do) — default to 'other'.
export const getCategoryId = (_item: PurchasedItem): CategoryId => 'other';

// Marker for whether the category came from auto-parse vs user edit.
// Until schema adds the field, every item is treated as auto-classified.
export const getCategorySource = (_item: PurchasedItem): 'auto' | 'user' => 'auto';

export const daysUntil = (iso: string | null, today: Date = new Date()): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
};

export type BadgeTone = 'neutral' | 'urgent' | 'warning' | 'safe';

export const badgeTone = (days: number | null): BadgeTone => {
  if (days == null) return 'neutral';
  if (days <= 0) return 'neutral';
  if (days <= 7) return 'urgent';
  if (days <= 14) return 'warning';
  return 'safe';
};

export const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

export const isStillRefundable = (item: PurchasedItem, today: Date = new Date()): boolean => {
  const days = daysUntil(item.return_by_date, today);
  return days != null && days > 0;
};

export interface ItemGroups<T> {
  thisMonth: T[];
  later: T[];
  noDeadline: T[];
}

export const groupItems = <T extends PurchasedItem>(items: T[], today: Date = new Date()): ItemGroups<T> => {
  const groups: ItemGroups<T> = { thisMonth: [], later: [], noDeadline: [] };
  for (const item of items) {
    const d = daysUntil(item.return_by_date, today);
    if (d == null) groups.noDeadline.push(item);
    else if (d <= 30) groups.thisMonth.push(item);
    else groups.later.push(item);
  }
  return groups;
};

export interface SpendStats {
  total: number;
  refundable: number;
  lost: number;
  count: number;
}

// Computes total / refundable / lost / count from an already-filtered item list.
// The caller is responsible for any timeframe filtering before this is called.
export const spendStats = (items: PurchasedItem[], today: Date = new Date()): SpendStats => {
  const total = items.reduce((s, i) => s + (i.price ?? 0), 0);
  const refundable = items
    .filter(i => isStillRefundable(i, today))
    .reduce((s, i) => s + (i.price ?? 0), 0);
  return { total, refundable, lost: total - refundable, count: items.length };
};

export const moneyFull = (n: number): string =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const sumPrices = (items: PurchasedItem[]): number =>
  items.reduce((s, i) => s + (i.price ?? 0), 0);

export const timeframeLabel = (months: number): string =>
  months === 1 ? 'last 30 days' : months === 6 ? 'last 6 months' : 'last year';

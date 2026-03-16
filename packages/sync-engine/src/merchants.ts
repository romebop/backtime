// Known merchant email patterns for detecting receipt emails
export const MERCHANT_PATTERNS = [
  { name: 'Amazon', senders: ['auto-confirm@amazon.com', 'ship-confirm@amazon.com', 'order-update@amazon.com'] },
  { name: 'Apple', senders: ['no_reply@email.apple.com'] },
  { name: 'Best Buy', senders: ['BestBuyInfo@emailinfo.bestbuy.com'] },
  { name: 'Target', senders: ['target@target.com', 'noreply@target.com'] },
  { name: 'Walmart', senders: ['help@walmart.com', 'noreply@walmart.com'] },
  { name: 'Nike', senders: ['nike@official.nike.com'] },
  { name: 'Samsung', senders: ['no-reply@samsung.com', 'order@samsung.com'] },
  { name: 'Costco', senders: ['costco@online.costco.com'] },
  { name: 'Home Depot', senders: ['homedepot@order.homedepot.com'] },
  { name: 'Nordstrom', senders: ['nordstrom@e.nordstrom.com'] },
  { name: 'Macy\'s', senders: ['customerservice@macys.com'] },
  { name: 'eBay', senders: ['ebay@ebay.com'] },
  { name: 'Etsy', senders: ['transaction@etsy.com'] },
];

// Build a Gmail search query for known merchant senders
// Falls back to a broader subject-based search to catch unknown merchants
export const buildMerchantQuery = (): string => {
  const senders = MERCHANT_PATTERNS.flatMap(m => m.senders);
  const fromClauses = senders.map(s => `from:${s}`).join(' OR ');
  return `(${fromClauses}) OR subject:("order confirmation" OR "your order" OR "order receipt" OR "your receipt" OR "purchase confirmation" OR "shipping confirmation")`;
};

// Build a query scoped to emails after a certain date
export const buildIncrementalQuery = (afterDate: string): string => {
  const base = buildMerchantQuery();
  return `${base} after:${afterDate}`;
};

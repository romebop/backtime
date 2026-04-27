import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { User } from '@supabase/supabase-js';

import { PurchasedItem } from '@backtime/types';
import { type ParsedPurchase } from '@backtime/sync-engine';
import { supabase } from '../lib/supabase';
import { useSync, type ItemCallbacks } from '../hooks/useSync';
import type { ThemeMode } from '../hooks/useThemeMode';
import {
  CATEGORIES,
  type CategoryId,
  type BadgeTone,
  badgeTone,
  daysUntil,
  formatDate,
  getCategory,
  getCategoryId,
  getCategorySource,
  groupItems,
  isStillRefundable,
  moneyFull,
  spendStats,
  sumPrices,
  timeframeLabel,
} from '../util/dashboard';
import AddItem from './AddItem';
import LoadingDots from './LoadingDots';
import RollingNumber from './RollingNumber';
import Settings from './Settings';
import ThemeIcon from './ThemeIcon';

type SyncStatus = 'pending' | 'saved' | 'error';
type DisplayItem = PurchasedItem & { _syncStatus?: SyncStatus };

type ViewMode = 'rows' | 'cards';

interface ContentProps {
  user: User;
  mode: ThemeMode;
  onToggleTheme: () => void;
  handleLogout: () => void;
}

interface Filters {
  timeframe: 1 | 6 | 12;
  refundableOnly: boolean;
  categories: CategoryId[];
}

const Content: React.FC<ContentProps> = ({ user, mode, onToggleTheme, handleLogout }) => {
  const [dbItems, setDbItems] = useState<PurchasedItem[]>([]);
  const [optimisticItems, setOptimisticItems] = useState<DisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filters, setFilters] = useState<Filters>({ timeframe: 12, refundableOnly: false, categories: [] });
  const [viewMode, setViewMode] = useState<ViewMode>('rows');
  const [search, setSearch] = useState('');

  const itemCallbacks = useRef<ItemCallbacks>({
    onExtracted: (purchase: ParsedPurchase, emailId: string) => {
      const item: DisplayItem = {
        id: `optimistic-${emailId}`,
        user_id: user.id,
        name: purchase.name,
        merchant: purchase.merchant,
        price: purchase.price,
        purchase_date: purchase.purchaseDate,
        return_by_date: purchase.returnByDate,
        warranty_end_date: purchase.warrantyEndDate,
        order_number: purchase.orderNumber,
        email_id: emailId,
        status: 'active',
        source: 'email_scan',
        return_policy: null,
        created_at: new Date().toISOString(),
        _syncStatus: 'pending',
      };
      setOptimisticItems(prev => [...prev, item]);
    },
    onSaved: (emailId: string) => {
      setOptimisticItems(prev =>
        prev.map(item => item.email_id === emailId ? { ...item, _syncStatus: 'saved' as const } : item)
      );
      setTimeout(() => {
        setOptimisticItems(prev =>
          prev.map(item => item.email_id === emailId ? { ...item, _syncStatus: undefined } : item)
        );
      }, 2500);
    },
    onFailed: (emailId: string) => {
      setOptimisticItems(prev =>
        prev.map(item => item.email_id === emailId ? { ...item, _syncStatus: 'error' as const } : item)
      );
    },
  }).current;

  const { isSyncing, progress, result, error: syncError, startSync } = useSync(user.id, itemCallbacks);

  const allItems: DisplayItem[] = useMemo(() => {
    const dbEmailIds = new Set(dbItems.map(item => item.email_id).filter(Boolean));
    const stillOptimistic = optimisticItems.filter(item => !dbEmailIds.has(item.email_id));
    return [...stillOptimistic, ...dbItems];
  }, [dbItems, optimisticItems]);

  const filteredItems = useMemo(() => {
    const today = new Date();
    const cutoff = new Date(today);
    cutoff.setMonth(cutoff.getMonth() - filters.timeframe);
    const q = search.trim().toLowerCase();
    return allItems.filter(item => {
      if (item.purchase_date && new Date(item.purchase_date) < cutoff) return false;
      if (filters.refundableOnly && !isStillRefundable(item, today)) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(getCategoryId(item))) return false;
      if (q) {
        const hay = `${item.name ?? ''} ${item.merchant ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allItems, filters, search]);

  const stats = useMemo(() => spendStats(filteredItems), [filteredItems]);
  const groups = useMemo(() => groupItems(filteredItems), [filteredItems]);
  const refundPct = stats.total > 0 ? (stats.refundable / stats.total) * 100 : 0;

  const fetchItems = async (initial = false) => {
    if (initial) setIsLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('return_by_date', { ascending: true });

    if (!error && data) setDbItems(data as PurchasedItem[]);
    if (initial) setIsLoading(false);
  };

  const removeItem = useCallback(async (id: string) => {
    setDbItems(prev => prev.filter(item => item.id !== id));
    await supabase.from('items').delete().eq('id', id);
  }, []);

  useEffect(() => {
    fetchItems(true);
    startSync();

    const channel = supabase
      .channel('items-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` },
        (payload) => setDbItems(prev => [...prev, payload.new as PurchasedItem])
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` },
        (payload) => setDbItems(prev =>
          prev.map(item => item.id === (payload.new as PurchasedItem).id ? payload.new as PurchasedItem : item)
        )
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` },
        (payload) => setDbItems(prev => prev.filter(item => item.id !== (payload.old as PurchasedItem).id))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  const toggleCategory = (id: CategoryId) => {
    setFilters(f => {
      const isAll = f.categories.length === 0;
      const curr = isAll ? [] : f.categories;
      const next = curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id];
      return { ...f, categories: next.length === CATEGORIES.length ? [] : next };
    });
  };

  const bannerVariant: 'syncing' | 'done' | 'error' = syncError ? 'error' : isSyncing ? 'syncing' : 'done';
  const bannerMessage = ((): string => {
    if (isSyncing) {
      if (!progress) return 'Checking for new purchases...';
      const found = progress.itemName ? ` — found ${progress.itemName}` : '';
      return `Scanning purchases... ${progress.current}/${progress.total}${found}`;
    }
    if (syncError) return `Sync failed: ${syncError}`;
    if (!result) return 'Ready to sync';
    if (result.synced === 0) return 'All purchases up to date';
    const failed = result.errors > 0 ? ` (${result.errors} failed)` : '';
    return `Synced ${result.synced} purchase${result.synced === 1 ? '' : 's'}${failed}`;
  })();

  return (
    <Page>
      <TopBar>
        <Brand>
          <Logo src="/favicon.svg" alt="" width={20} height={20} />
          <Wordmark>BackTime</Wordmark>
          <UserEmail>{user.email}</UserEmail>
        </Brand>
        <TopActions>
          <IconButton aria-label="Settings" onClick={() => setShowSettings(true)}>
            <SettingsIcon />
          </IconButton>
          <IconButton aria-label="Toggle theme" onClick={onToggleTheme}>
            <ThemeIcon mode={mode} size={15} />
          </IconButton>
        </TopActions>
      </TopBar>

      <Body>
        <Sidebar>
          <FilterSection label="Timeframe">
            {([
              { v: 1 as const,  l: '1 month' },
              { v: 6 as const,  l: '6 months' },
              { v: 12 as const, l: '1 year' },
            ]).map(o => (
              <FilterRadio
                key={o.v}
                active={filters.timeframe === o.v}
                onClick={() => setFilters(f => ({ ...f, timeframe: o.v }))}
              >
                {o.l}
              </FilterRadio>
            ))}
          </FilterSection>

          <FilterSection label="Status">
            <FilterCheck
              active={filters.refundableOnly}
              onClick={() => setFilters(f => ({ ...f, refundableOnly: !f.refundableOnly }))}
            >
              Refundable only
            </FilterCheck>
          </FilterSection>

          <FilterSection label="Category">
            {CATEGORIES.map(c => {
              const all = filters.categories.length === 0;
              const on = all || filters.categories.includes(c.id);
              return (
                <FilterCheck key={c.id} active={on} dot={c.color} onClick={() => toggleCategory(c.id)}>
                  {c.label}
                </FilterCheck>
              );
            })}
          </FilterSection>
        </Sidebar>

        <Main>
          <SyncRow>
            <SyncBanner $variant={bannerVariant}>
              <BannerDot $variant={bannerVariant} />
              <span>{bannerMessage}</span>
              {isSyncing && progress && (
                <BannerProgress style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }} />
              )}
            </SyncBanner>
            <QuietAddButton onClick={() => setShowAddItem(true)} title="Add an item we couldn't find in your inbox">
              <PlusIcon />
              Add manually
            </QuietAddButton>
          </SyncRow>

          <SpendCard>
            <SpendCol>
              <SpendLabel>Spend {timeframeLabel(filters.timeframe)}</SpendLabel>
              <SpendTotalRow>
                <SpendTotal><RollingNumber value={stats.total} format={moneyFull} /></SpendTotal>
                <SpendCount>{stats.count} purchase{stats.count === 1 ? '' : 's'}</SpendCount>
              </SpendTotalRow>
              <SpendBar>
                <SpendBarFill style={{ width: `${refundPct}%` }} />
              </SpendBar>
              <SpendLegend>
                <RefundableTag>
                  <LegendDot />
                  <RollingNumber value={stats.refundable} format={moneyFull} /> still refundable
                </RefundableTag>
                <LostTag><RollingNumber value={stats.lost} format={moneyFull} /> past window</LostTag>
              </SpendLegend>
            </SpendCol>
            <TrioCol>
              <Trio label="Refundable %" value={<RollingNumber value={refundPct} format={percentInt} />} accent />
            </TrioCol>
          </SpendCard>

          <Toolbar>
            <SearchBox>
              <SearchIcon />
              <SearchInput
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search items, merchants…"
              />
              {search && (
                <ClearButton aria-label="Clear search" onClick={() => setSearch('')}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </ClearButton>
              )}
            </SearchBox>
            <ItemCount>
              Showing {filteredItems.length} of {allItems.length}
            </ItemCount>
            <ViewToggle>
              <ViewToggleBtn $active={viewMode === 'rows'} onClick={() => setViewMode('rows')} aria-label="Row view" title="Rows">
                <ListIcon />
              </ViewToggleBtn>
              <ViewToggleBtn $active={viewMode === 'cards'} onClick={() => setViewMode('cards')} aria-label="Card view" title="Cards">
                <GridIcon />
              </ViewToggleBtn>
            </ViewToggle>
          </Toolbar>

          {isLoading || (filteredItems.length === 0 && isSyncing) ? (
            <LoadingDots />
          ) : filteredItems.length === 0 ? (
            <EmptyState>No purchases match your filters.</EmptyState>
          ) : viewMode === 'rows' ? (
            <>
              {groups.thisMonth.length > 0 && (
                <ItemGroup label="This month" items={groups.thisMonth} onRemove={removeItem} />
              )}
              {groups.later.length > 0 && (
                <ItemGroup label="Later" items={groups.later} onRemove={removeItem} />
              )}
              {groups.noDeadline.length > 0 && (
                <ItemGroup label="No return deadline" items={groups.noDeadline} onRemove={removeItem} />
              )}
            </>
          ) : (
            <CardGrid>
              {filteredItems.map(item => (
                <ItemCard key={item.id} item={item} onRemove={removeItem} />
              ))}
            </CardGrid>
          )}
        </Main>
      </Body>

      <AddItem userId={user.id} open={showAddItem} onClose={() => setShowAddItem(false)} />
      <Settings open={showSettings} onClose={() => setShowSettings(false)} onLogout={handleLogout} />
    </Page>
  );
};

export default Content;

/* ---------- Sub-components ---------- */

const FilterSection: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <FilterGroup>
    <FilterGroupLabel>{label}</FilterGroupLabel>
    <FilterStack>{children}</FilterStack>
  </FilterGroup>
);

const FilterRadio: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <RadioBtn $active={active} onClick={onClick}>
    <RadioCircle $active={active}>{active && <RadioInner />}</RadioCircle>
    {children}
  </RadioBtn>
);

const FilterCheck: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; dot?: string }> = ({ active, onClick, children, dot }) => (
  <CheckBtn $active={active} onClick={onClick}>
    <CheckBox $active={active}>
      {active && (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </CheckBox>
    {dot && <CategoryDot style={{ background: dot }} />}
    {children}
  </CheckBtn>
);

const Trio: React.FC<{ label: string; value: React.ReactNode; accent?: boolean }> = ({ label, value, accent }) => (
  <TrioStat>
    <TrioLabel>{label}</TrioLabel>
    <TrioValue $accent={accent}>{value}</TrioValue>
  </TrioStat>
);

const ItemGroup: React.FC<{ label: string; items: DisplayItem[]; onRemove: (id: string) => void }> = ({ label, items, onRemove }) => (
  <>
    <GroupHeader>
      <GroupLabel>
        {label}
        <GroupCount>{items.length} item{items.length === 1 ? '' : 's'}</GroupCount>
      </GroupLabel>
      <GroupSum>{moneyFull(sumPrices(items))}</GroupSum>
    </GroupHeader>
    <RowList>
      {items.map(item => (
        <ItemRow key={item.id} item={item} onRemove={onRemove} />
      ))}
    </RowList>
  </>
);

const ItemRow: React.FC<{ item: DisplayItem; onRemove: (id: string) => void }> = ({ item, onRemove }) => {
  const days = daysUntil(item.return_by_date);
  const tone = badgeTone(days);
  const status = item._syncStatus;
  return (
    <Row $syncStatus={status}>
      <RowLeft>
        <RowName>{item.name}</RowName>
        <RowMeta>
          {item.merchant && <span>{item.merchant}</span>}
          {item.purchase_date && (
            <>
              <MetaDot />
              <span>Purchased {formatDate(item.purchase_date)}</span>
            </>
          )}
          <MetaSpacer />
          <CategoryChip categoryId={getCategoryId(item)} source={getCategorySource(item)} />
          {status && <SyncIndicator $status={status}>{syncLabel(status)}</SyncIndicator>}
        </RowMeta>
      </RowLeft>
      <RowPrice>{item.price != null ? moneyFull(item.price) : '—'}</RowPrice>
      <RowBadge>
        <Badge $tone={tone}>{badgeText(days)}</Badge>
      </RowBadge>
      <RowActions>
        <RowIconBtn aria-label="View receipt"><FileIcon /></RowIconBtn>
        <RowIconBtn aria-label="Edit"><EditIcon /></RowIconBtn>
        <RowIconBtn aria-label="Delete" onClick={() => onRemove(item.id)}><TrashIcon /></RowIconBtn>
      </RowActions>
    </Row>
  );
};

const ItemCard: React.FC<{ item: DisplayItem; onRemove: (id: string) => void }> = ({ item, onRemove }) => {
  const days = daysUntil(item.return_by_date);
  const tone = badgeTone(days);
  return (
    <Card>
      <CardTopRow>
        <CategoryChip categoryId={getCategoryId(item)} source={getCategorySource(item)} compact />
        <Badge $tone={tone} $compact>{badgeText(days)}</Badge>
      </CardTopRow>
      <CardBody>
        <CardName>{item.name}</CardName>
        <CardMeta>
          {item.merchant ?? '—'}{item.purchase_date ? ` · ${formatDate(item.purchase_date)}` : ''}
        </CardMeta>
      </CardBody>
      <CardFooter>
        <CardPrice>{item.price != null ? moneyFull(item.price) : '—'}</CardPrice>
        <CardActions>
          <RowIconBtn aria-label="View receipt"><FileIcon /></RowIconBtn>
          <RowIconBtn aria-label="Delete" onClick={() => onRemove(item.id)}><TrashIcon /></RowIconBtn>
        </CardActions>
      </CardFooter>
    </Card>
  );
};

const CategoryChip: React.FC<{ categoryId: CategoryId; source: 'auto' | 'user'; compact?: boolean }> = ({ categoryId, source, compact }) => {
  const cat = getCategory(categoryId);
  return (
    <Chip $compact={compact} $dashed={source === 'auto'}>
      <ChipDot style={{ background: cat.color }} />
      {cat.label}
    </Chip>
  );
};

const badgeText = (days: number | null) =>
  days == null ? 'no deadline' : days <= 0 ? 'expired' : `${days}d left`;

const percentInt = (n: number) => `${Math.round(n)}%`;

const syncLabel = (s: SyncStatus) =>
  s === 'pending' ? 'Saving…' : s === 'saved' ? 'Saved' : 'Failed';

/* ---------- Icons ---------- */

const PlusIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const SettingsIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const SearchIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const FileIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const EditIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);
const TrashIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const ListIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const GridIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
);
const CategoryDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
`;

/* ---------- Layout ---------- */

const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.bgPage};
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 32px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bgPage};
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Logo = styled.img`
  display: block;
`;

const Wordmark = styled.span`
  font-family: 'Geist', 'Outfit', system-ui, sans-serif;
  font-weight: 500;
  font-size: 18px;
  color: ${({ theme }) => theme.colors.textHeading};
  letter-spacing: -0.015em;
`;

const UserEmail = styled.span`
  color: ${({ theme }) => theme.colors.textDimmed};
  font-size: 13px;
  margin-left: 14px;
  font-weight: 300;
`;

const TopActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SyncRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 10px;
`;

const QuietAddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 400;
  font-family: 'Outfit', sans-serif;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  opacity: 0.75;
  transition: color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.textHeading};
    border-color: ${({ theme }) => theme.colors.borderHover};
    opacity: 1;
  }
`;

const IconButton = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 7px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: grid;
  place-items: center;
  transition: color 0.15s ease, border-color 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.textHeading};
    border-color: ${({ theme }) => theme.colors.borderHover};
  }
`;

const Body = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  flex: 1;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  min-height: calc(100vh - 64px);

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.aside`
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  @media (max-width: 900px) {
    border-right: none;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const FilterGroup = styled.div``;

const FilterGroupLabel = styled.div`
  font-size: 10.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textDimmed};
  font-weight: 500;
  margin-bottom: 10px;
`;

const FilterStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const RadioBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  font-size: 13px;
  font-weight: 400;
  background: ${({ $active, theme }) => $active ? theme.colors.bgSurface : 'transparent'};
  border: none;
  border-radius: 7px;
  cursor: pointer;
  color: ${({ $active, theme }) => $active ? theme.colors.textHeading : theme.colors.textSecondary};
  font-family: 'Outfit', sans-serif;
  text-align: left;
  width: 100%;
  opacity: ${({ $active }) => $active ? 1 : 0.75};
`;

const RadioCircle = styled.span<{ $active: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid ${({ $active, theme }) => $active ? theme.colors.textHeading : theme.colors.borderHover};
  display: grid;
  place-items: center;
  flex-shrink: 0;
`;

const RadioInner = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.textHeading};
`;

const CheckBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  font-size: 13px;
  font-weight: 400;
  background: transparent;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  color: ${({ $active, theme }) => $active ? theme.colors.textHeading : theme.colors.textSecondary};
  font-family: 'Outfit', sans-serif;
  text-align: left;
  width: 100%;
  opacity: ${({ $active }) => $active ? 1 : 0.75};
`;

const CheckBox = styled.span<{ $active: boolean }>`
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1.5px solid ${({ $active, theme }) => $active ? theme.colors.textHeading : theme.colors.borderHover};
  background: ${({ $active, theme }) => $active ? theme.colors.textHeading : 'transparent'};
  display: grid;
  place-items: center;
  color: ${({ $active, theme }) => $active ? theme.colors.bgPage : 'transparent'};
  flex-shrink: 0;
`;

const Main = styled.main`
  padding: 24px 28px 80px;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const SyncBanner = styled.div<{ $variant: 'syncing' | 'done' | 'error' }>`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: ${({ $variant, theme }) => theme.banner[$variant].bg};
  border: 1px solid ${({ $variant, theme }) => theme.banner[$variant].border};
  border-radius: 10px;
  color: ${({ $variant, theme }) => theme.banner[$variant].text};
  font-size: 13px;
  position: relative;
  overflow: hidden;
`;

const pulseDot = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.3); opacity: 0.65; }
`;

const BannerDot = styled.span<{ $variant: 'syncing' | 'done' | 'error' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $variant, theme }) =>
    $variant === 'syncing' ? theme.colors.accentBlue
      : $variant === 'error' ? theme.banner.error.text
      : theme.colors.accentGreen};
  box-shadow: 0 0 0 3px ${({ $variant, theme }) =>
    ($variant === 'syncing' ? theme.colors.accentBlue
      : $variant === 'error' ? theme.banner.error.text
      : theme.colors.accentGreen) + '22'};
  animation: ${({ $variant }) => $variant === 'syncing' ? pulseDot : 'none'} 1.6s ease-in-out infinite;
`;

const BannerProgress = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  background: ${({ theme }) => theme.colors.accentBlue};
  transition: width 0.4s ease;
`;

const SpendCard = styled.div`
  margin-top: 24px;
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 36px;
  align-items: flex-end;
  padding: 22px 24px;
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    gap: 24px;
    align-items: stretch;
  }
`;

const SpendCol = styled.div``;

const SpendLabel = styled.div`
  font-size: 10.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textDimmed};
  font-weight: 500;
  margin-bottom: 10px;
`;

const SpendTotalRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
`;

const SpendTotal = styled.span`
  font-family: 'Geist', 'Outfit', system-ui, sans-serif;
  font-size: 36px;
  font-weight: 500;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.textHeading};
  font-variant-numeric: tabular-nums;
  line-height: 1;
`;

const SpendCount = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.textDimmed};
`;

const SpendBar = styled.div`
  height: 8px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.bgPage};
  position: relative;
  overflow: hidden;
`;

const SpendBarFill = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  background: ${({ theme }) => theme.colors.accentGreen};
  border-radius: 4px;
  transition: width 0.6s cubic-bezier(0.2, 0.7, 0, 1);
`;

const SpendLegend = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
`;

const RefundableTag = styled.span`
  color: ${({ theme }) => theme.colors.accentGreen};
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 7px;
`;

const LegendDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.accentGreen};
`;

const LostTag = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
`;

const TrioCol = styled.div`
  display: flex;
  align-items: center;
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  padding-left: 24px;

  @media (max-width: 760px) {
    border-left: none;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    padding-left: 0;
    padding-top: 16px;
  }
`;

const TrioStat = styled.div`
  padding-right: 6px;
`;

const TrioLabel = styled.div`
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textDimmed};
  font-weight: 500;
  margin-bottom: 6px;
`;

const TrioValue = styled.div<{ $accent?: boolean }>`
  font-size: 20px;
  font-weight: 500;
  color: ${({ $accent, theme }) => $accent ? theme.colors.accentGreen : theme.colors.textHeading};
  font-family: 'Geist', 'Outfit', system-ui, sans-serif;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
  margin-bottom: 14px;
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 9px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const SearchInput = styled.input`
  background: transparent;
  border: none;
  outline: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 13px;
  font-family: 'Outfit', sans-serif;
  flex: 1;
  min-width: 0;
  padding: 0;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textDimmed};
  }
`;

const ClearButton = styled.button`
  background: transparent;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textMuted};
  display: grid;
  place-items: center;
  border-radius: 4px;
  transition: color 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.textHeading};
  }
`;

const ItemCount = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ViewToggle = styled.div`
  display: inline-flex;
  padding: 2px;
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
`;

const ViewToggleBtn = styled.button<{ $active: boolean }>`
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: ${({ $active, theme }) => $active ? theme.colors.bgPage : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.textHeading : theme.colors.textMuted};
  display: grid;
  place-items: center;
  box-shadow: ${({ $active }) => $active ? '0 1px 2px rgba(0, 0, 0, 0.08)' : 'none'};
  transition: color 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.textHeading};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.textDimmed};
  padding: 80px 0;
  font-size: 14px;
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 28px 4px 12px 4px;
`;

const GroupLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.textDimmed};
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const GroupCount = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  letter-spacing: 0;
  font-weight: 400;
  text-transform: none;
  font-size: 12px;
`;

const GroupSum = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 400;
  font-variant-numeric: tabular-nums;
`;

const RowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Row = styled.div<{ $syncStatus?: SyncStatus }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ $syncStatus, theme }) =>
    $syncStatus === 'error' ? theme.banner.error.border : 'transparent'};
  border-radius: 10px;
  transition: border-color 0.15s ease;
  opacity: ${({ $syncStatus }) => $syncStatus === 'pending' ? 0.7 : 1};

  &:hover {
    border-color: ${({ theme }) => theme.colors.borderHover};
  }
`;

const RowLeft = styled.div`
  min-width: 0;
`;

const RowName = styled.div`
  color: ${({ theme }) => theme.colors.textHeading};
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.005em;
`;

const RowMeta = styled.div`
  color: ${({ theme }) => theme.colors.textDimmed};
  font-size: 12px;
  margin-top: 3px;
  font-weight: 300;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const MetaDot = styled.span`
  opacity: 0.5;
  &::before { content: '·'; }
`;

const MetaSpacer = styled.span`
  width: 8px;
`;

const RowPrice = styled.div`
  font-family: 'JetBrains Mono', monospace;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  min-width: 72px;
  text-align: right;
`;

const RowBadge = styled.div`
  min-width: 74px;
  display: flex;
  justify-content: center;
`;

const RowActions = styled.div`
  display: flex;
  gap: 4px;
`;

const RowIconBtn = styled.button`
  background: transparent;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textMuted};
  border-radius: 6px;
  display: grid;
  place-items: center;
  transition: color 0.15s ease, background 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.textHeading};
    background: ${({ theme }) => theme.colors.bgPage};
  }
`;

const Badge = styled.span<{ $tone: BadgeTone; $compact?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: ${({ $compact }) => $compact ? '2px 8px' : '3px 10px'};
  font-size: ${({ $compact }) => $compact ? '11px' : '12px'};
  font-weight: 500;
  background: ${({ $tone, theme }) => theme.badge[$tone].bg};
  color: ${({ $tone, theme }) => theme.badge[$tone].text};
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
  white-space: nowrap;
`;

const Chip = styled.span<{ $compact?: boolean; $dashed?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${({ $compact }) => $compact ? '1px 8px' : '2px 9px'};
  font-size: ${({ $compact }) => $compact ? '10.5px' : '11px'};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: transparent;
  border: 1px ${({ $dashed }) => $dashed ? 'dashed' : 'solid'} ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  letter-spacing: 0.01em;
`;

const ChipDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
`;

const SyncIndicator = styled.span<{ $status: SyncStatus }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $status, theme }) =>
    $status === 'pending' ? theme.colors.accentBlue
    : $status === 'saved' ? theme.colors.accentGreen
    : theme.banner.error.text};
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 180px;
`;

const CardTopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`;

const CardBody = styled.div`
  flex: 1;
`;

const CardName = styled.div`
  color: ${({ theme }) => theme.colors.textHeading};
  font-size: 15px;
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: -0.005em;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
`;

const CardMeta = styled.div`
  color: ${({ theme }) => theme.colors.textDimmed};
  font-size: 12px;
  margin-top: 6px;
  font-weight: 300;
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CardPrice = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textHeading};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
`;

const CardActions = styled.div`
  display: flex;
  gap: 2px;
`;

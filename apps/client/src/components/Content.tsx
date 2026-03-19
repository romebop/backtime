import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import styled, { useTheme, keyframes } from 'styled-components';
import { User } from '@supabase/supabase-js';

import { PurchasedItem } from '@backtime/types';
import { type ParsedPurchase } from '@backtime/sync-engine';
import { supabase } from '../lib/supabase';
import { useSync, type ItemCallbacks } from '../hooks/useSync';
import AddItem from './AddItem';
import LoadingDots from './LoadingDots';

type SyncStatus = 'pending' | 'saved' | 'error';
type DisplayItem = PurchasedItem & { _syncStatus?: SyncStatus };

interface ContentProps {
  handleLogout: () => void;
  user: User;
}

const Content: React.FC<ContentProps> = ({ handleLogout, user }) => {

  const [dbItems, setDbItems] = useState<PurchasedItem[]>([]);
  const [optimisticItems, setOptimisticItems] = useState<DisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const theme = useTheme();

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
        prev.map(item =>
          item.email_id === emailId ? { ...item, _syncStatus: 'saved' as const } : item
        )
      );
      // Clear sync status after fade animation completes
      setTimeout(() => {
        setOptimisticItems(prev =>
          prev.map(item =>
            item.email_id === emailId ? { ...item, _syncStatus: undefined } : item
          )
        );
      }, 2500);
    },
    onFailed: (emailId: string) => {
      setOptimisticItems(prev =>
        prev.map(item =>
          item.email_id === emailId ? { ...item, _syncStatus: 'error' as const } : item
        )
      );
    },
  }).current;

  const { isSyncing, progress, result, error: syncError, startSync } = useSync(user.id, itemCallbacks);

  // Merge DB items with optimistic items — DB wins for matching email_ids
  // Optimistic items only disappear once the real DB row arrives
  const items: DisplayItem[] = useMemo(() => {
    const dbEmailIds = new Set(dbItems.map(item => item.email_id).filter(Boolean));
    const stillOptimistic = optimisticItems.filter(
      item => !dbEmailIds.has(item.email_id)
    );
    return [...stillOptimistic, ...dbItems];
  }, [dbItems, optimisticItems]);

  const fetchItems = async (initial = false) => {
    if (initial) setIsLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('return_by_date', { ascending: true });

    if (!error && data) {
      setDbItems(data as PurchasedItem[]);
    }
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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setDbItems(prev => [...prev, payload.new as PurchasedItem]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setDbItems(prev =>
            prev.map(item => item.id === (payload.new as PurchasedItem).id ? payload.new as PurchasedItem : item)
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setDbItems(prev => prev.filter(item => item.id !== (payload.old as PurchasedItem).id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  const getDaysRemaining = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getBadgeColor = (days: number | null) => {
    if (days === null || days <= 0) return theme.badge.neutral;
    if (days <= 7) return theme.badge.urgent;
    if (days <= 14) return theme.badge.warning;
    return theme.badge.safe;
  };

  const getDateGroup = (days: number | null): string => {
    if (days === null) return 'No return deadline';
    if (days <= 0) return 'Expired';
    if (days <= 7) return 'This week';
    if (days <= 30) return 'This month';
    return 'Later';
  };

  const groupedItems = useMemo(() => {
    const groupOrder = ['This week', 'This month', 'Later', 'No return deadline', 'Expired'];
    const groups: Record<string, DisplayItem[]> = {};
    for (const item of items) {
      const days = getDaysRemaining(item.return_by_date);
      const group = getDateGroup(days);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    }
    return groupOrder
      .filter(g => groups[g]?.length)
      .map(g => ({ label: g, items: groups[g] }));
  }, [items]);

  return (
    <>
      <TopBar>
        <UserInfo>{user.email}</UserInfo>
        <ButtonGroup>
          <ActionButton onClick={() => setShowAddItem(true)}>+ Add Item</ActionButton>
          <SecondaryButton onClick={handleLogout}>Logout</SecondaryButton>
        </ButtonGroup>
      </TopBar>
      {showAddItem && (
        <AddItem userId={user.id} onClose={() => setShowAddItem(false)} />
      )}
      <StatusBanner $variant={syncError ? 'error' : isSyncing ? 'syncing' : 'done'}>
        {isSyncing ? (
          <>
            <StatusDot $variant="syncing" />
            {progress
              ? `Scanning purchases... ${progress.current}/${progress.total}${progress.itemName ? ` — found ${progress.itemName}` : ''}`
              : 'Checking for new purchases...'
            }
          </>
        ) : syncError ? (
          <>
            <StatusDot $variant="error" />
            {`Sync failed: ${syncError}`}
          </>
        ) : result ? (
          <>
            <StatusDot $variant="done" />
            {
          result.synced > 0
            ? `Synced ${result.synced} purchase${result.synced === 1 ? '' : 's'}${result.errors > 0 ? ` (${result.errors} failed)` : ''}`
            : 'All purchases up to date'}
          </>
        ) : (
          'Ready to sync'
        )}
      </StatusBanner>
      {isLoading ? (
        <LoadingDots />
      ) : items.length === 0 && isSyncing ? (
        <LoadingDots />
      ) : items.length === 0 ? (
        <EmptyState>No purchases found. Add your first item!</EmptyState>
      ) : (
        <ListContainer>
          {groupedItems.map(({ label, items: groupItems }) => (
            <DateGroup key={label}>
              <DateLabel>{label}</DateLabel>
              <ItemList>
                {groupItems.map(item => {
                  const daysLeft = getDaysRemaining(item.return_by_date);
                  const badge = getBadgeColor(daysLeft);
                  const syncStatus = item._syncStatus;
                  return (
                    <ItemRow key={item.id} $syncStatus={syncStatus}>
                      <ItemLeft>
                        <ItemName>{item.name}</ItemName>
                        <ItemMeta>
                          {item.merchant && <Merchant>{item.merchant}</Merchant>}
                          {item.purchase_date && (
                            <MetaDot />
                          )}
                          {item.purchase_date && (
                            <PurchaseDate>
                              Purchased {new Date(item.purchase_date).toLocaleDateString()}
                            </PurchaseDate>
                          )}
                          {item.warranty_end_date && (
                            <>
                              <MetaDot />
                              <WarrantyInfo>
                                Warranty until {new Date(item.warranty_end_date).toLocaleDateString()}
                              </WarrantyInfo>
                            </>
                          )}
                        </ItemMeta>
                      </ItemLeft>
                      <ItemCenter>
                        {item.price != null && <Price>${item.price.toFixed(2)}</Price>}
                        {daysLeft !== null && (
                          <Badge $bg={badge.bg} $text={badge.text}>
                            {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                          </Badge>
                        )}
                        <SyncSlot>
                          {syncStatus && (
                            <SyncIndicator $status={syncStatus}>
                              {syncStatus === 'pending' ? (
                                <><Spinner viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" /></Spinner>Saving...</>
                              ) : syncStatus === 'saved' ? (
                                <><SyncIcon viewBox="0 0 16 16"><path d="M3 8.5l3.5 3.5L13 4" /></SyncIcon>Saved</>
                              ) : (
                                <><SyncIcon viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" /></SyncIcon>Failed</>
                              )}
                            </SyncIndicator>
                          )}
                        </SyncSlot>
                      </ItemCenter>
                      <ItemActions>
                        {item.order_number && (
                          <ActionIcon title="View order" onClick={() => {}}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                          </ActionIcon>
                        )}
                        <ActionIcon title="Remove item" onClick={() => removeItem(item.id)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </ActionIcon>
                      </ItemActions>
                    </ItemRow>
                  );
                })}
              </ItemList>
            </DateGroup>
          ))}
        </ListContainer>
      )}
    </>
  );
};

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 720px;
  margin-bottom: 28px;
`;

const UserInfo = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.btnPrimaryBg};
  color: ${({ theme }) => theme.colors.btnPrimaryText};
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.btnPrimaryHover};
  }
`;

const SecondaryButton = styled.button`
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: ${({ theme }) => theme.colors.borderHover};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.textDimmed};
  margin-top: 80px;
  font-size: 16px;
`;

const StatusBanner = styled.div<{ $variant: 'syncing' | 'done' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 720px;
  padding: 12px 20px;
  margin-bottom: 20px;
  background: ${({ $variant, theme }) => theme.banner[$variant].bg};
  border: 1px solid ${({ $variant, theme }) => theme.banner[$variant].border};
  border-radius: 10px;
  font-size: 14px;
  color: ${({ $variant, theme }) => theme.banner[$variant].text};
`;

const dotColors = {
  syncing: (theme: any) => theme.colors.accentBlue,
  done: (theme: any) => theme.colors.accentGreen,
  error: (theme: any) => theme.banner.error.text,
};

const StatusDot = styled.div<{ $variant: 'syncing' | 'done' | 'error' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $variant, theme }) => dotColors[$variant](theme)};
  animation: ${({ $variant }) => $variant === 'syncing' ? 'pulse 1.5s ease-in-out infinite' : 'none'};
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`;

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
  width: 100%;
  max-width: 720px;
`;

const DateGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DateLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textDimmed};
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ItemRow = styled.div<{ $syncStatus?: SyncStatus }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  background: ${({ theme }) => theme.colors.bgElevated};
  border: 1px solid ${({ $syncStatus, theme }) =>
    $syncStatus === 'error' ? theme.banner.error.border : theme.colors.border};
  border-radius: 12px;
  transition: border-color 0.15s, opacity 0.2s;
  opacity: ${({ $syncStatus }) => $syncStatus === 'pending' ? 0.7 : 1};
  &:hover {
    border-color: ${({ theme }) => theme.colors.borderHover};
  }
`;

const ItemLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
`;

const ItemName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textHeading};
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;

const MetaDot = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.textDimmed};
  flex-shrink: 0;
`;

const Merchant = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const PurchaseDate = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textDimmed};
`;

const ItemCenter = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
`;

const ItemActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 4px;
`;

const ActionIcon = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.textDimmed};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.bgSurface};
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const Price = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textHeading};
  white-space: nowrap;
`;

const Badge = styled.div<{ $bg: string; $text: string }>`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ $text }) => $text};
  background: ${({ $bg }) => $bg};
  white-space: nowrap;
`;

const WarrantyInfo = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textDimmed};
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const fadeOut = keyframes`
  0% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; }
`;

const SyncSlot = styled.div`
  width: 80px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const SyncIndicator = styled.div<{ $status: 'pending' | 'error' | 'saved' }>`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ $status, theme }) =>
    $status === 'pending' ? theme.colors.accentBlue
    : $status === 'saved' ? theme.colors.accentGreen
    : theme.banner.error.text};
  animation: ${({ $status }) => $status === 'saved' ? fadeOut : 'none'} 2.5s ease forwards;
`;

const Spinner = styled.svg`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  animation: ${spin} 0.8s linear infinite;
  circle {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-dasharray: 28;
    stroke-dashoffset: 8;
    stroke-linecap: round;
  }
`;

const SyncIcon = styled.svg`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  path {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
`;

export default Content;

import React, { useEffect, useState, useMemo, useRef } from 'react';
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
      ) : items.length === 0 ? (
        <EmptyState>No items yet. Add your first purchase!</EmptyState>
      ) : (
        <GridContainer>
          {items.map(item => {
            const daysLeft = getDaysRemaining(item.return_by_date);
            const badge = getBadgeColor(daysLeft);
            const syncStatus = item._syncStatus;
            return (
              <ItemCard key={item.id} $syncStatus={syncStatus}>
                <CardTop>
                  <ItemName>{item.name}</ItemName>
                  {item.price != null && <Price>${item.price.toFixed(2)}</Price>}
                </CardTop>
                {item.merchant && <Merchant>{item.merchant}</Merchant>}
                <CardBottom>
                  {daysLeft !== null && (
                    <Badge $bg={badge.bg} $text={badge.text}>
                      {daysLeft > 0 ? `${daysLeft}d left to return` : 'Return expired'}
                    </Badge>
                  )}
                  {item.warranty_end_date && (
                    <WarrantyInfo>
                      Warranty until {new Date(item.warranty_end_date).toLocaleDateString()}
                    </WarrantyInfo>
                  )}
                </CardBottom>
                <SyncRow>
                  {syncStatus === 'pending' ? (
                    <SyncIndicator $status="pending">
                      <Spinner viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" /></Spinner>
                      Saving...
                    </SyncIndicator>
                  ) : syncStatus === 'saved' ? (
                    <SyncIndicator $status="saved">
                      <SyncIcon viewBox="0 0 16 16"><path d="M3 8.5l3.5 3.5L13 4" /></SyncIcon>
                      Saved
                    </SyncIndicator>
                  ) : syncStatus === 'error' ? (
                    <SyncIndicator $status="error">
                      <SyncIcon viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" /></SyncIcon>
                      Save failed
                    </SyncIndicator>
                  ) : null}
                </SyncRow>
              </ItemCard>
            );
          })}
        </GridContainer>
      )}
    </>
  );
};

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1200px;
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
  max-width: 1200px;
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

const GridContainer = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  width: 100%;
  max-width: 1200px;
`;

const ItemCard = styled.div<{ $syncStatus?: SyncStatus }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
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

const CardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`;

const ItemName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textHeading};
  line-height: 1.3;
`;

const Merchant = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Price = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textHeading};
  white-space: nowrap;
`;

const CardBottom = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`;

const Badge = styled.div<{ $bg: string; $text: string }>`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ $text }) => $text};
  background: ${({ $bg }) => $bg};
`;

const WarrantyInfo = styled.div`
  font-size: 13px;
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

const SyncRow = styled.div`
  min-height: 18px;
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

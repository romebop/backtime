import React, { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { User } from '@supabase/supabase-js';

import { PurchasedItem } from '@backtime/types';
import { supabase } from '../lib/supabase';
import { useSync, type PendingItem } from '../hooks/useSync';
import AddItem from './AddItem';
import LoadingDots from './LoadingDots';

interface ContentProps {
  handleLogout: () => void;
  user: User;
}

const Content: React.FC<ContentProps> = ({ handleLogout, user }) => {

  const [items, setItems] = useState<PurchasedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const { isSyncing, progress, result, error: syncError, pendingItems, startSync } = useSync(user.id);
  const theme = useTheme();

  const fetchItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('return_by_date', { ascending: true });

    if (!error && data) {
      setItems(data as PurchasedItem[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems();
    startSync();

    const channel = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` },
        () => { fetchItems(); }
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
      ) : items.length === 0 && pendingItems.length === 0 ? (
        <EmptyState>No items yet. Add your first purchase!</EmptyState>
      ) : (
        <GridContainer>
          {pendingItems.filter(p => p.status !== 'saved').map(pending => (
            <ItemCard key={`pending-${pending.tempId}`} $pending={pending.status}>
              <CardTop>
                <ItemName>{pending.name}</ItemName>
                {pending.price != null && <Price>${pending.price.toFixed(2)}</Price>}
              </CardTop>
              {pending.merchant && <Merchant>{pending.merchant}</Merchant>}
              <CardBottom>
                <SyncStatus $status={pending.status}>
                  {pending.status === 'pending' ? 'Saving...' : 'Save failed'}
                </SyncStatus>
              </CardBottom>
            </ItemCard>
          ))}
          {items.map(item => {
            const daysLeft = getDaysRemaining(item.return_by_date);
            const badge = getBadgeColor(daysLeft);
            return (
              <ItemCard key={item.id}>
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

const ItemCard = styled.div<{ $pending?: 'pending' | 'error' }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  background: ${({ theme }) => theme.colors.bgElevated};
  border: 1px solid ${({ $pending, theme }) =>
    $pending === 'error' ? theme.banner.error.border : theme.colors.border};
  border-radius: 12px;
  transition: border-color 0.15s, opacity 0.2s;
  opacity: ${({ $pending }) => $pending === 'pending' ? 0.7 : 1};
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

const SyncStatus = styled.div<{ $status: 'pending' | 'error' }>`
  font-size: 13px;
  font-weight: 500;
  color: ${({ $status, theme }) =>
    $status === 'pending' ? theme.colors.accentBlue : theme.banner.error.text};
`;

export default Content;

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { User } from '@supabase/supabase-js';

import { PurchasedItem } from '@backtime/types';
import { supabase } from '../lib/supabase';
import { useSync } from '../hooks/useSync';
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
  const { isSyncing, progress, startSync } = useSync(user.id);

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

    // real-time subscription for item changes
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
    if (days === null) return '#888';
    if (days <= 0) return '#888';
    if (days <= 7) return '#e74c3c';
    if (days <= 14) return '#f39c12';
    return '#27ae60';
  };

  return (
    <>
      <TopBar>
        <UserInfo>
          <span>{user.email}</span>
        </UserInfo>
        <ButtonGroup>
          <Button onClick={() => setShowAddItem(true)}>+ Add Item</Button>
          <Button onClick={handleLogout}>Logout</Button>
        </ButtonGroup>
      </TopBar>
      {showAddItem && (
        <AddItem userId={user.id} onClose={() => setShowAddItem(false)} />
      )}
      {isSyncing && (
        <SyncBanner>
          {progress
            ? `Scanning purchases... ${progress.current}/${progress.total}${progress.itemName ? ` — found ${progress.itemName}` : ''}`
            : 'Checking for new purchases...'
          }
        </SyncBanner>
      )}
      {isLoading ? (
        <LoadingDots />
      ) : items.length === 0 ? (
        <EmptyState>
          <p>No items yet. Add your first purchase!</p>
        </EmptyState>
      ) : (
        <GridContainer>
          {items.map(item => {
            const daysLeft = getDaysRemaining(item.return_by_date);
            return (
              <ItemCard key={item.id}>
                <ItemName>{item.name}</ItemName>
                {item.merchant && <Merchant>{item.merchant}</Merchant>}
                {item.price && <Price>${item.price.toFixed(2)}</Price>}
                {daysLeft !== null && (
                  <Badge $color={getBadgeColor(daysLeft)}>
                    {daysLeft > 0 ? `${daysLeft} days left to return` : 'Return expired'}
                  </Badge>
                )}
                {item.warranty_end_date && (
                  <WarrantyInfo>
                    Warranty until {new Date(item.warranty_end_date).toLocaleDateString()}
                  </WarrantyInfo>
                )}
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
  margin-bottom: 24px;
`;

const UserInfo = styled.div`
  font-size: 14px;
  color: #666;
`;

const EmptyState = styled.div`
  text-align: center;
  color: #888;
  margin-top: 40px;
`;

const GridContainer = styled.div`
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  width: 100%;
  max-width: 1200px;
`;

const ItemCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
`;

const ItemName = styled.div`
  font-size: 18px;
  font-weight: 600;
`;

const Merchant = styled.div`
  font-size: 14px;
  color: #666;
`;

const Price = styled.div`
  font-size: 16px;
  font-weight: 500;
`;

const Badge = styled.div<{ $color: string }>`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  color: white;
  background-color: ${({ $color }) => $color};
  width: fit-content;
`;

const WarrantyInfo = styled.div`
  font-size: 13px;
  color: #888;
`;

const SyncBanner = styled.div`
  width: 100%;
  max-width: 1200px;
  padding: 10px 20px;
  margin-bottom: 16px;
  background: #f0f7ff;
  border: 1px solid #c4dff6;
  border-radius: 8px;
  font-size: 14px;
  color: #1a73e8;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const Button = styled.button`
  padding: 6px 16px;
  cursor: pointer;
`;

export default Content;

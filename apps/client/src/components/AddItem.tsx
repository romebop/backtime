import React, { useState } from 'react';
import styled from 'styled-components';

import { supabase } from '../lib/supabase';
import { CATEGORIES, type CategoryId } from '../util/dashboard';
import SlideOverPanel from './SlideOverPanel';

interface AddItemProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

const AddItem: React.FC<AddItemProps> = ({ userId, open, onClose }) => {
  const [name, setName] = useState('');
  const [merchant, setMerchant] = useState('');
  const [price, setPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [returnByDate, setReturnByDate] = useState('');
  // Schema doesn't have product_category yet — captured here for forward-compat;
  // not persisted until the migration lands.
  const [category, setCategory] = useState<CategoryId>('other');
  const [refundable, setRefundable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsSubmitting(true);
    await supabase.from('items').insert({
      user_id: userId,
      name,
      merchant: merchant || null,
      price: price ? parseFloat(price) : null,
      purchase_date: purchaseDate || null,
      return_by_date: returnByDate || null,
      source: 'manual',
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <SlideOverPanel
      open={open}
      onClose={onClose}
      title="Add item manually"
      subtitle="Fill in details for a purchase we couldn't parse from email"
      ariaLabel="Add item"
      footer={
        <>
          <CancelBtn type="button" onClick={onClose}>Cancel</CancelBtn>
          <SaveBtn type="submit" form="add-item-form" disabled={isSubmitting || !name}>
            {isSubmitting ? 'Saving…' : 'Save item'}
          </SaveBtn>
        </>
      }
    >
      <Form id="add-item-form" onSubmit={handleSubmit}>
        <Field>
          <FieldLabel>Item name</FieldLabel>
          <Input placeholder="e.g. Winter Coat" value={name} onChange={e => setName(e.target.value)} required />
        </Field>
        <Row2>
          <Field>
            <FieldLabel>Merchant</FieldLabel>
            <Input placeholder="e.g. Uniqlo" value={merchant} onChange={e => setMerchant(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Price</FieldLabel>
            <Input placeholder="$0.00" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
          </Field>
        </Row2>
        <Row2>
          <Field>
            <FieldLabel>Purchased</FieldLabel>
            <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Return deadline</FieldLabel>
            <Input type="date" value={returnByDate} onChange={e => setReturnByDate(e.target.value)} />
          </Field>
        </Row2>
        <Field>
          <FieldLabel>Category</FieldLabel>
          <CategoryRow>
            {CATEGORIES.map(c => (
              <CategoryChip key={c.id} type="button" $active={category === c.id} onClick={() => setCategory(c.id)}>
                <ChipDot style={{ background: c.color }} />
                {c.label}
              </CategoryChip>
            ))}
          </CategoryRow>
        </Field>
        <RefundToggle>
          <input type="checkbox" checked={refundable} onChange={e => setRefundable(e.target.checked)} />
          <RefundLabel>Eligible for refund</RefundLabel>
        </RefundToggle>
      </Form>
    </SlideOverPanel>
  );
};

export default AddItem;

const Form = styled.form`
  display: grid;
  gap: 16px;
`;

const Field = styled.div``;

const FieldLabel = styled.label`
  display: block;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textDimmed};
  margin-bottom: 7px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.inputBg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 14px;
  font-family: 'Outfit', sans-serif;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${({ theme }) => theme.colors.borderHover};
  }
`;

const Row2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const CategoryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const CategoryChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 12.5px;
  font-weight: 500;
  background: ${({ $active, theme }) => $active ? theme.colors.bgSurface : 'transparent'};
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.borderHover : theme.colors.border};
  color: ${({ $active, theme }) => $active ? theme.colors.textHeading : theme.colors.textSecondary};
  border-radius: 999px;
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
`;

const ChipDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
`;

const RefundToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: ${({ theme }) => theme.colors.bgSurface};
  border-radius: 8px;
  cursor: pointer;
`;

const RefundLabel = styled.span`
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const CancelBtn = styled.button`
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 9px;
  cursor: pointer;
  font-family: 'Outfit', sans-serif;

  &:hover {
    border-color: ${({ theme }) => theme.colors.borderHover};
    color: ${({ theme }) => theme.colors.textHeading};
  }
`;

const SaveBtn = styled.button`
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 500;
  background: ${({ theme }) => theme.colors.btnPrimaryBg};
  color: ${({ theme }) => theme.colors.btnPrimaryText};
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font-family: 'Outfit', sans-serif;

  &:hover { background: ${({ theme }) => theme.colors.btnPrimaryHover}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

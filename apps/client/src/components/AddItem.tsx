import React, { useState } from 'react';
import styled from 'styled-components';

import { supabase } from '../lib/supabase';

interface AddItemProps {
  userId: string;
  onClose: () => void;
}

const AddItem: React.FC<AddItemProps> = ({ userId, onClose }) => {

  const [name, setName] = useState('');
  const [merchant, setMerchant] = useState('');
  const [price, setPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [returnByDate, setReturnByDate] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
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
      warranty_end_date: warrantyEndDate || null,
      source: 'manual',
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={e => e.stopPropagation()}>
        <Title>Add Purchase</Title>
        <Form onSubmit={handleSubmit}>
          <Label>
            Item Name *
            <Input value={name} onChange={e => setName(e.target.value)} required />
          </Label>
          <Label>
            Merchant
            <Input value={merchant} onChange={e => setMerchant(e.target.value)} />
          </Label>
          <Label>
            Price
            <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
          </Label>
          <Label>
            Purchase Date
            <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
          </Label>
          <Label>
            Return By Date
            <Input type="date" value={returnByDate} onChange={e => setReturnByDate(e.target.value)} />
          </Label>
          <Label>
            Warranty End Date
            <Input type="date" value={warrantyEndDate} onChange={e => setWarrantyEndDate(e.target.value)} />
          </Label>
          <ButtonRow>
            <CancelButton type="button" onClick={onClose}>Cancel</CancelButton>
            <SubmitButton type="submit" disabled={isSubmitting || !name}>
              {isSubmitting ? 'Adding...' : 'Add Item'}
            </SubmitButton>
          </ButtonRow>
        </Form>
      </Modal>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.colors.overlay};
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.bgElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 32px;
  width: 100%;
  max-width: 420px;
`;

const Title = styled.h2`
  margin: 0 0 20px 0;
  font-size: 20px;
  color: ${({ theme }) => theme.colors.textHeading};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  font-size: 14px;
  background: ${({ theme }) => theme.colors.inputBg};
  color: ${({ theme }) => theme.colors.textPrimary};
  transition: border-color 0.15s;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.borderHover};
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
`;

const CancelButton = styled.button`
  padding: 10px 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: ${({ theme }) => theme.colors.borderHover};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const SubmitButton = styled.button`
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.btnPrimaryBg};
  color: ${({ theme }) => theme.colors.btnPrimaryText};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.btnPrimaryHover};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export default AddItem;

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
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const Modal = styled.div`
  background: white;
  border-radius: 12px;
  padding: 32px;
  width: 100%;
  max-width: 420px;
`;

const Title = styled.h2`
  margin: 0 0 20px 0;
  font-size: 20px;
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
  color: #444;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
`;

const CancelButton = styled.button`
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
`;

const SubmitButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #333;
  color: white;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default AddItem;

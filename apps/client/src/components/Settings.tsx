import React from 'react';
import styled from 'styled-components';

import SlideOverPanel from './SlideOverPanel';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ open, onClose, onLogout }) => (
  <SlideOverPanel open={open} onClose={onClose} title="Settings" subtitle="Manage your account and preferences">
    <Section>
      <SectionLabel>Account</SectionLabel>
      <LogoutBtn type="button" onClick={onLogout}>
        <LogoutIcon />
        Sign out
      </LogoutBtn>
    </Section>
  </SlideOverPanel>
);

const LogoutIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default Settings;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textDimmed};
`;

const LogoutBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 500;
  font-family: 'Outfit', sans-serif;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 9px;
  cursor: pointer;
  align-self: flex-start;
  transition: color 0.15s ease, border-color 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.textHeading};
    border-color: ${({ theme }) => theme.colors.borderHover};
  }
`;

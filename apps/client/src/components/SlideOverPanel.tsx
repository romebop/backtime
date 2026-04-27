import React from 'react';
import styled from 'styled-components';

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  ariaLabel?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const SlideOverPanel: React.FC<SlideOverPanelProps> = ({
  open, onClose, title, subtitle, ariaLabel, children, footer,
}) => (
  <>
    <Overlay $open={open} onClick={onClose} />
    <Panel $open={open} role="dialog" aria-label={ariaLabel ?? title} aria-hidden={!open}>
      <Header>
        <HeaderText>
          <PanelTitle>{title}</PanelTitle>
          {subtitle && <PanelSubtitle>{subtitle}</PanelSubtitle>}
        </HeaderText>
        <CloseBtn type="button" onClick={onClose} aria-label="Close">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </CloseBtn>
      </Header>
      <Body>{children}</Body>
      {footer && <Footer>{footer}</Footer>}
    </Panel>
  </>
);

export default SlideOverPanel;

const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.colors.overlay};
  backdrop-filter: blur(2px);
  z-index: 40;
  opacity: ${({ $open }) => $open ? 1 : 0};
  pointer-events: ${({ $open }) => $open ? 'auto' : 'none'};
  transition: opacity 0.25s ease;
`;

const Panel = styled.aside<{ $open: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 440px;
  max-width: 92vw;
  background: ${({ theme }) => theme.colors.bgElevated};
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  z-index: 50;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ $open }) => $open ? '-20px 0 60px rgba(0, 0, 0, 0.25)' : 'none'};
  transform: translateX(${({ $open }) => $open ? '0' : '100%'});
  transition: transform 0.3s cubic-bezier(0.2, 0.7, 0, 1), box-shadow 0.3s ease;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const HeaderText = styled.div``;

const PanelTitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textHeading};
`;

const PanelSubtitle = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textDimmed};
  margin-top: 2px;
  font-weight: 300;
`;

const CloseBtn = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 7px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: grid;
  place-items: center;

  &:hover {
    color: ${({ theme }) => theme.colors.textHeading};
    border-color: ${({ theme }) => theme.colors.borderHover};
  }
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 22px 24px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

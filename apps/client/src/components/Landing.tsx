import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import type { ThemeMode } from '../hooks/useThemeMode';
import ThemeIcon from './ThemeIcon';

interface LandingProps {
  onSignIn: () => void;
  mode: ThemeMode;
  onToggleTheme: () => void;
}

const TRUST_POINTS = [
  'We never see your emails',
  'Open source',
];

const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

const CheckMark: React.FC = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Landing: React.FC<LandingProps> = ({ onSignIn, mode, onToggleTheme }) => {
  return (
    <Page>
      <Nav style={delay(0)}>
        <Brand>
          <Logo src="/favicon.svg" alt="" width={22} height={22} />
          <Wordmark>BackTime</Wordmark>
        </Brand>
        <NavLinks>
          <NavLink href="#how">How it works</NavLink>
          <NavLink href="#privacy">Privacy</NavLink>
          <NavLink href="https://github.com/romebop/backtime" target="_blank" rel="noreferrer">Open source</NavLink>
          <ThemeToggle onClick={onToggleTheme} aria-label="Toggle theme">
            <ThemeIcon mode={mode} size={16} />
          </ThemeToggle>
        </NavLinks>
      </Nav>

      <HeroGrid>
        <HeroLeft>
          <Eyebrow style={delay(120)}>
            <EyebrowDot />
            Purchase tracking, automated
          </Eyebrow>
          <Title style={delay(200)}>
            Never miss a<br />return deadline<br />again.
          </Title>
          <Subtitle style={delay(320)}>
            BackTime connects to your Gmail, extracts purchase details right in your browser, and tracks return windows with countdown alerts.
          </Subtitle>
          <CTAButton onClick={onSignIn} style={delay(440)}>
            <GoogleG>G</GoogleG>
            Scan my inbox
          </CTAButton>
          <TrustRow style={delay(560)}>
            {TRUST_POINTS.map(point => (
              <TrustItem key={point}>
                <Tick><CheckMark /></Tick>
                {point}
              </TrustItem>
            ))}
          </TrustRow>
        </HeroLeft>

        <HeroRight style={delay(520)}>
          <Placeholder>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 16l5-5 4 4 3-3 6 6" />
              <circle cx="9" cy="9" r="1.5" />
            </svg>
            <PlaceholderLabel>Graphic placeholder</PlaceholderLabel>
            <PlaceholderDesc>Explanatory visual coming soon</PlaceholderDesc>
          </Placeholder>
        </HeroRight>
      </HeroGrid>
    </Page>
  );
};

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); filter: blur(4px); }
  to   { opacity: 1; transform: none;             filter: blur(0);   }
`;

const fadeIn = css`
  opacity: 0;
  will-change: opacity, transform, filter;
  animation: ${fadeUp} 0.85s cubic-bezier(0.2, 0.7, 0, 1) both;

  @media (prefers-reduced-motion: reduce) {
    opacity: 1;
    animation: none;
  }
`;

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bgPage};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 40px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bgPage};
  ${fadeIn}

  @media (max-width: 900px) {
    padding: 18px 20px;
  }
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
  font-size: 20px;
  color: ${({ theme }) => theme.colors.textHeading};
  letter-spacing: -0.015em;
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 28px;

  @media (max-width: 900px) {
    gap: 12px;
  }
`;

const NavLink = styled.a`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-decoration: none;
  font-weight: 400;
  transition: color 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.textPrimary};
  }

  @media (max-width: 900px) {
    display: none;
  }
`;

const ThemeToggle = styled.button`
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
    color: ${({ theme }) => theme.colors.textPrimary};
    border-color: ${({ theme }) => theme.colors.borderHover};
  }
`;

const HeroGrid = styled.main`
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 80px;
  padding: 80px 64px;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 48px;
    padding: 48px 24px;
  }
`;

const HeroLeft = styled.div`
  max-width: 520px;
`;

const Eyebrow = styled.div`
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textDimmed};
  margin-bottom: 18px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  ${fadeIn}
`;

const EyebrowDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.accentGreen};
  display: inline-block;
  box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.accentGreen}22;
`;

const Title = styled.h1`
  font-family: 'Geist', 'Outfit', system-ui, sans-serif;
  font-size: clamp(40px, 5vw, 60px);
  font-weight: 500;
  margin: 0 0 22px 0;
  line-height: 1.04;
  letter-spacing: -0.045em;
  color: ${({ theme }) => theme.colors.textHeading};
  text-wrap: pretty;
  ${fadeIn}
`;

const Subtitle = styled.p`
  font-size: 17px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0 0 32px;
  max-width: 460px;
  font-weight: 300;
  ${fadeIn}
`;

const CTAButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 14px 26px;
  font-size: 15px;
  font-weight: 500;
  font-family: 'Outfit', sans-serif;
  background: ${({ theme }) => theme.colors.btnPrimaryBg};
  color: ${({ theme }) => theme.colors.btnPrimaryText};
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04);
  ${fadeIn}

  &:hover {
    background: ${({ theme }) => theme.colors.btnPrimaryHover};
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.10), 0 8px 24px rgba(0, 0, 0, 0.06);
  }

  &:active {
    transform: translateY(0);
  }
`;

const GoogleG = styled.span`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  color: #18181b;
  display: inline-grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
`;

const TrustRow = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  flex-wrap: wrap;
  ${fadeIn}
`;

const TrustItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 400;
`;

const Tick = styled.span`
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  background: ${({ theme }) => theme.colors.accentGreen}22;
  color: ${({ theme }) => theme.colors.accentGreen};
`;

const HeroRight = styled.div`
  ${fadeIn}

  @media (max-width: 900px) {
    order: -1;
  }
`;

const Placeholder = styled.div`
  width: 100%;
  max-width: 560px;
  margin-left: auto;
  aspect-ratio: 1 / 1;
  background: ${({ theme }) => theme.colors.bgElevated};
  border: 1px dashed ${({ theme }) => theme.colors.borderHover};
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: ${({ theme }) => theme.colors.textDimmed};

  @media (max-width: 900px) {
    margin: 0 auto;
  }
`;

const PlaceholderLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const PlaceholderDesc = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 300;
`;

export default Landing;

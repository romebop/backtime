import React from 'react';
import styled, { keyframes } from 'styled-components';

interface LandingProps {
  onSignIn: () => void;
}

const Landing: React.FC<LandingProps> = ({ onSignIn }) => {

  return (
    <Container>
      <Hero>
        <Eyebrow>Purchase tracking, automated</Eyebrow>
        <Title>Never miss a<br />return deadline again</Title>
        <Subtitle>
          BackTime connects to your Gmail, extracts purchase details right in your browser, and tracks your return windows with countdown alerts.
        </Subtitle>
        <HeroCTA>
          <GoogleButton onClick={onSignIn}>
            <GoogleLogo src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" />
            Continue with Google
          </GoogleButton>
          <CTAHint>We'll ask for read-only email access to find your receipts</CTAHint>
        </HeroCTA>
      </Hero>

      <Divider />

      <Steps>
        <StepsLabel>How it works</StepsLabel>
        <Pipeline>
          <PipelineNode $delay={0}>
            <NodeCircle>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </NodeCircle>
            <NodeText>
              <StepTitle>Connects to your Gmail</StepTitle>
              <StepDesc>Scans for order confirmations from merchants like Amazon, Best Buy, Target, and more.</StepDesc>
            </NodeText>
          </PipelineNode>

          <Connector $delay={0}>
            <ConnectorLine />
            <ConnectorDot />
          </Connector>

          <PipelineNode $delay={1}>
            <NodeCircle>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
                <circle cx="12" cy="15" r="2" />
              </svg>
            </NodeCircle>
            <NodeText>
              <StepTitle>Extracts purchase details</StepTitle>
              <StepDesc>Receipts are parsed entirely in your browser — your email content never leaves your device.</StepDesc>
            </NodeText>
          </PipelineNode>

          <Connector $delay={1}>
            <ConnectorLine />
            <ConnectorDot />
          </Connector>

          <PipelineNode $delay={2}>
            <NodeCircle>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </NodeCircle>
            <NodeText>
              <StepTitle>Tracks your return windows</StepTitle>
              <StepDesc>Shows countdown badges for each purchase and alerts you before return deadlines expire.</StepDesc>
            </NodeText>
          </PipelineNode>
        </Pipeline>
        <PrivacyDetails>
          <PrivacyItem>
            <CheckIcon>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </CheckIcon>
            Your emails never touch our servers — all parsing happens in your browser
          </PrivacyItem>
          <PrivacyItem>
            <CheckIcon>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </CheckIcon>
            Read-only Gmail access — we can never send, delete, or modify anything
          </PrivacyItem>
          <PrivacyItem>
            <CheckIcon>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </CheckIcon>
            We only store item name, price, date, and merchant — nothing else
          </PrivacyItem>
          <PrivacyItem>
            <CheckIcon>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </CheckIcon>
            Fully open source — audit every line of code yourself
          </PrivacyItem>
        </PrivacyDetails>
      </Steps>
    </Container>
  );
};

// Animations
const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const drawLine = keyframes`
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
`;

const Container = styled.div`
  max-width: 680px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 64px;
  padding: 64px 24px 80px;
`;

const Hero = styled.div`
  text-align: center;
  animation: ${fadeUp} 0.2s ease-out both;
`;

const Eyebrow = styled.div`
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textDimmed};
  margin-bottom: 20px;
`;

const Title = styled.h1`
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(36px, 6vw, 52px);
  font-weight: 400;
  margin: 0 0 20px 0;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.textHeading};
`;

const Subtitle = styled.p`
  font-size: 17px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0 auto 36px;
  max-width: 440px;
  font-weight: 300;
`;

const HeroCTA = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const GoogleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 28px;
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

  &:hover {
    background: ${({ theme }) => theme.colors.btnPrimaryHover};
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1), 0 8px 24px rgba(0, 0, 0, 0.06);
  }

  &:active {
    transform: translateY(0);
  }
`;

const GoogleLogo = styled.img`
  width: 20px;
  height: 20px;
  filter: brightness(0) invert(1);
`;

const CTAHint = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textDimmed};
  margin: 0;
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
  animation: ${drawLine} 0.25s ease-out 0.125s both;
  transform-origin: left;
`;

const Steps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
`;

const StepsLabel = styled.div`
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textDimmed};
  text-align: center;
`;

const travelDot = keyframes`
  0% { left: -6px; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { left: calc(100% - 2px); opacity: 0; }
`;

const Pipeline = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0;

  @media (max-width: 580px) {
    flex-direction: column;
    align-items: center;
  }
`;

const PipelineNode = styled.div<{ $delay: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 160px;
  flex-shrink: 0;
  text-align: center;
  animation: ${fadeUp} 0.2s ease-out 0.15s both;
`;

const NodeCircle = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 2px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textPrimary};
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;

  ${PipelineNode}:hover & {
    border-color: ${({ theme }) => theme.colors.textDimmed};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.border};
  }
`;

const NodeText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 8px;
`;

const Connector = styled.div<{ $delay: number }>`
  position: relative;
  height: 2px;
  flex: 1;
  margin-top: 28px;
  margin-left: -36px;
  margin-right: -36px;
  z-index: 0;
  animation: ${fadeUp} 0.2s ease-out 0.15s both;

  @media (max-width: 580px) {
    width: 2px;
    height: 32px;
    flex: none;
    margin: 0;
  }
`;

const ConnectorLine = styled.div`
  position: absolute;
  inset: 0;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 1px;

  @media (max-width: 580px) {
    width: 2px;
    height: 100%;
  }
`;

const ConnectorDot = styled.div`
  position: absolute;
  top: -2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.textDimmed};
  animation: ${travelDot} 1.6s ease-in-out infinite;
  animation-delay: 0.6s;

  @media (max-width: 580px) {
    top: auto;
    left: -2px !important;
    animation: none;
  }
`;

const StepTitle = styled.div`
  font-weight: 600;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.textPrimary};
  line-height: 1.3;
`;

const StepDesc = styled.div`
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 300;
`;

const PrivacyDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
  animation: ${fadeUp} 0.175s ease-out 0.275s both;
`;

const PrivacyItem = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 300;
`;

const CheckIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.accentGreen}18;
  color: ${({ theme }) => theme.colors.accentGreen};
  flex-shrink: 0;
`;

export default Landing;

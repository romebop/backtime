import React from 'react';
import styled from 'styled-components';

interface LandingProps {
  onSignIn: () => void;
}

const Landing: React.FC<LandingProps> = ({ onSignIn }) => {

  return (
    <Container>
      <Hero>
        <Title>Never miss a return deadline again</Title>
        <Subtitle>
          Backtime scans your receipts and tracks return windows automatically.
        </Subtitle>
      </Hero>

      <Steps>
        <Step>
          <StepNumber>1</StepNumber>
          <StepText>
            <StepTitle>We scan your inbox for receipts</StepTitle>
            <StepDesc>We look for order confirmations from merchants like Amazon, Best Buy, Target, and more.</StepDesc>
          </StepText>
        </Step>
        <Step>
          <StepNumber>2</StepNumber>
          <StepText>
            <StepTitle>AI extracts purchase details on your device</StepTitle>
            <StepDesc>Google's AI parses your receipts right in your browser. Your emails never leave your device.</StepDesc>
          </StepText>
        </Step>
        <Step>
          <StepNumber>3</StepNumber>
          <StepText>
            <StepTitle>Get alerts before return deadlines</StepTitle>
            <StepDesc>We only save the item name, price, date, and merchant. You get notified before time runs out.</StepDesc>
          </StepText>
        </Step>
      </Steps>

      <PrivacySection>
        <PrivacyTitle>Your emails never leave your device</PrivacyTitle>
        <DataFlow>
          <FlowStep>
            <FlowIcon>1</FlowIcon>
            <FlowLabel>Your Browser</FlowLabel>
            <FlowDesc>fetches receipts from Gmail</FlowDesc>
          </FlowStep>
          <FlowArrow>&rarr;</FlowArrow>
          <FlowStep>
            <FlowIcon>2</FlowIcon>
            <FlowLabel>Google AI</FlowLabel>
            <FlowDesc>parses them on your device</FlowDesc>
          </FlowStep>
          <FlowArrow>&rarr;</FlowArrow>
          <FlowStep>
            <FlowIcon>3</FlowIcon>
            <FlowLabel>Backtime</FlowLabel>
            <FlowDesc>only saves purchase details</FlowDesc>
          </FlowStep>
        </DataFlow>
        <PrivacyDetails>
          <PrivacyItem>We request read-only access — we can never send, delete, or modify your emails</PrivacyItem>
          <PrivacyItem>Email content is processed in your browser, not on our servers</PrivacyItem>
          <PrivacyItem>Our code is open source — verify it yourself</PrivacyItem>
        </PrivacyDetails>
      </PrivacySection>

      <CTASection>
        <CTALabel>We'll ask for email read access to find your receipts</CTALabel>
        <GoogleButton onClick={onSignIn}>
          <GoogleLogo src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" />
          Continue with Google
        </GoogleButton>
      </CTASection>
    </Container>
  );
};

const Container = styled.div`
  max-width: 640px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 48px;
  padding: 48px 24px;
`;

const Hero = styled.div`
  text-align: center;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 12px 0;
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.textHeading};
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0;
`;

const Steps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Step = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
`;

const StepNumber = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.btnPrimaryBg};
  color: ${({ theme }) => theme.colors.btnPrimaryText};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
`;

const StepText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StepTitle = styled.div`
  font-weight: 600;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const StepDesc = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const PrivacySection = styled.div`
  background: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 28px;
`;

const PrivacyTitle = styled.h3`
  margin: 0 0 20px 0;
  font-size: 18px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textHeading};
`;

const DataFlow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
`;

const FlowStep = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
  flex: 1;
`;

const FlowIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
`;

const FlowArrow = styled.div`
  font-size: 20px;
  color: ${({ theme }) => theme.colors.textDimmed};
  padding-top: 4px;
`;

const FlowLabel = styled.div`
  font-weight: 600;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const FlowDesc = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const PrivacyDetails = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PrivacyItem = styled.li`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding-left: 20px;
  position: relative;
  &::before {
    content: '\\2713';
    position: absolute;
    left: 0;
    color: ${({ theme }) => theme.colors.accentGreen};
    font-weight: 600;
  }
`;

const CTASection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const CTALabel = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textDimmed};
  margin: 0;
  text-align: center;
`;

const GoogleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 500;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  background: #ffffff;
  color: #3c4043;
  border: 1px solid #dadce0;
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    background: #f8f9fa;
    border-color: #c6c6c6;
  }
`;

const GoogleLogo = styled.img`
  width: 20px;
  height: 20px;
`;

export default Landing;

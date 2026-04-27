import React from 'react';
import styled from 'styled-components';

interface RollingNumberProps {
  value: number;
  format: (n: number) => string;
  duration?: number;
}

const RollingNumber: React.FC<RollingNumberProps> = ({ value, format, duration = 500 }) => {
  const text = format(value);
  return (
    <Wrapper>
      {Array.from(text).map((char, i) => {
        if (char >= '0' && char <= '9') {
          return <DigitSlot key={i} digit={Number(char)} duration={duration} />;
        }
        return <Static key={i}>{char}</Static>;
      })}
    </Wrapper>
  );
};

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const DigitSlot: React.FC<{ digit: number; duration: number }> = React.memo(({ digit, duration }) => (
  <Slot>
    <Column
      style={{
        transform: `translateY(-${digit}em)`,
        transitionDuration: `${duration}ms`,
      }}
    >
      {DIGITS.map(d => <Cell key={d}>{d}</Cell>)}
    </Column>
  </Slot>
));

export default React.memo(RollingNumber);

const Wrapper = styled.span`
  display: inline-flex;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
`;

const Slot = styled.span`
  display: inline-block;
  height: 1em;
  line-height: 1;
  overflow: hidden;
  vertical-align: baseline;
`;

const Column = styled.span`
  display: block;
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
`;

const Cell = styled.span`
  display: block;
  height: 1em;
  line-height: 1;
`;

const Static = styled.span`
  display: inline-block;
`;

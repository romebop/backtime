import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const LoadingDots: React.FC = () => {

  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setDotCount(count => (count + 1) % 4);
    }, 300);

    return () => clearInterval(id);
  }, []);

  return (
    <DotsHouse>
      Loading
      <span>
        <Dot visible={dotCount > 0}>.</Dot>
        <Dot visible={dotCount > 1}>.</Dot>
        <Dot visible={dotCount > 2}>.</Dot>
      </span>
    </DotsHouse>
  );
};

const DotsHouse = styled.div`
  min-height: 18px;
`;

const Dot = styled.span<{ visible: boolean }>`
  opacity: ${({ visible }) => visible ? 1 : 0};
`;

export default LoadingDots;

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const LoadingDots: React.FC = () => {

  const [dots, setDots] = useState<string>('');

  useEffect(() => {
    const id = setInterval(() => {
      setDots(dots => dots.length < 3 ? dots + '.' : '');
    }, 300);

    return () => clearInterval(id);
  }, []);

  return (
    <DotsHouse>[Loading{dots}]</DotsHouse>
  );
};

const DotsHouse = styled.div`
  min-height: 18px;
`;

export default LoadingDots;

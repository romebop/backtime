import React from 'react';
import styled from 'styled-components';

const Content: React.FC = () => {
  return (
    <Container>
      <p>You are logged in!</p>
      <Emoji>( •̀ᄇ• ́)ﻭ✧</Emoji>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  align-items: center;
`;

const Emoji = styled.pre`
  margin-left: 8px;
`;

export default Content;

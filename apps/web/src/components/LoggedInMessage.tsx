import React from 'react';
import styled from 'styled-components';

const LoggedInMessage: React.FC = () => {
  return (
    <MessageContainer>
      <h2>You are logged in!</h2>
      <p>Welcome back.</p>
    </MessageContainer>
  );
};

const MessageContainer = styled.div`
  padding: 20px;
  border: 1px solid #4CAF50;
  border-radius: 8px;
  background-color: #e8f5e9;
  color: #2e7d32;
  text-align: center;
`;

export default LoggedInMessage;

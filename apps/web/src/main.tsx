import React from 'react'
import ReactDOM from 'react-dom/client'
import Auth from './components/Auth';
import styled from 'styled-components';

const AppWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWrapper>
      <Auth />
    </AppWrapper>
  </React.StrictMode>,
)
import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import styled from 'styled-components';

import { UserData } from '@backtime/types';
import Auth from './components/Auth';
import Content from './components/Content';
import LoadingDots from './components/LoadingDots';
import axiosInstance, { setAccessToken } from './util/axiosInstance';
import { GlobalStyle } from './util/globalStyle';

const App: React.FC = () => {

  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await axiosInstance.post<{ accessToken: string, userData: UserData }>('/auth/refresh');
        const { accessToken, userData } = res.data;
        setAccessToken(accessToken);
        setUserData(userData);
      } catch (err) {
        void err;
        setAccessToken(null);
        setUserData(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkLogin();
  }, []);

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (err) {
      void err;
    } finally {
      setAccessToken(null);
      setUserData(null);
    }
  }

  return (
    <Wrapper>
      {isLoading
        ? <LoadingDots />
        : userData !== null
          ? <Content {...{ handleLogout, userData }} />
          : <Auth {...{ setUserData }} />
      }
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
`;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalStyle />
    <App />
  </React.StrictMode>,
)
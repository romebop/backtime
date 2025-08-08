import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import styled from 'styled-components';
import axiosInstance from './util/axiosInstance';

import { UserData } from '@backtime/types';
import Auth from './components/Auth';
import Content from './components/Content';

const App: React.FC = () => {

  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const response = await axiosInstance.get<UserData>('/auth/me');
        setUserData(response.data);
      } catch (error) {
        console.error('Login check failed:', error);
        setUserData(null);
      }
    };
    checkLogin();
  }, []);

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUserData(null);
      window.location.href = '/';
    }
  }

  return (
    <Wrapper>
      {userData !== null
        ? <Content
            handleLogout={handleLogout}
            userData={userData}
          />
        : <Auth handleLogin={setUserData} />}
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
    <App />
  </React.StrictMode>,
)
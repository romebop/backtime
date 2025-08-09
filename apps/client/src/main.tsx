import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import styled from 'styled-components';

import { UserData } from '@backtime/types';
import Auth from './components/Auth';
import Content from './components/Content';
import axiosInstance from './util/axiosInstance';

const App: React.FC = () => {

  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await axiosInstance.get<UserData>('/auth/me');
        setUserData(res.data);
      } catch (err) {
        console.error(err);
        setUserData(null);
      }
    };
    checkLogin();
  }, []);

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (err) {
      console.error(err);
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
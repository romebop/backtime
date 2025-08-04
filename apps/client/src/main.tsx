import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import styled from 'styled-components';

import Auth from './components/Auth';
import Content from './components/Content';
import { UserData } from '@backtime/types';

const App: React.FC = () => {

  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await fetch('/auth/me');
        if (!res.ok) {
          const errorMessage = (await res.json()).message;
          throw new Error(`(${res.status}) ${errorMessage}`);
        }
        const data = await res.json();
        setUserData(data.userData);
      } catch (error) {
        console.error(error);
        setUserData(null);
      }
    };
    checkLogin();
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/auth/logout', { method: 'POST' });
      if (!res.ok) {
        const errorMessage = (await res.json()).message;
        throw new Error(`(${res.status}) ${errorMessage}`);
      }
    } catch (error) {
      console.error(error);
    }
    setUserData(null);
    window.location.href = '/';
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
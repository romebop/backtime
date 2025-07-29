import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import styled from 'styled-components';

import Auth from './components/Auth';
import Content from './components/Content';

import { User } from './util/types';

const App: React.FC = () => {

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);

  useEffect(() => {
    
    const checkLogin = async () => {
      try {
        const res = await fetch('/auth/me');
        if (!res.ok) {
          throw new Error(`HTTP error: ${res.status}`);
        }
        const data = await res.json();
        handleLogin(data.user);
      } catch (error) {
        console.error('error checking login status:', error);
        setIsLoggedIn(false);
        setUserData(null);
      }
    };
    
    checkLogin();

  }, []);

  const handleLogin = (user: User) => {
    setIsLoggedIn(true);
    setUserData(user);
  };

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('error logging out:', error);
    }
    setIsLoggedIn(false);
    setUserData(null);
    window.location.href = '/';
  }

  return (
    <Wrapper>
      {(isLoggedIn && userData)
        ? <Content
            handleLogout={handleLogout}
            userData={userData}
          />
        : <Auth handleLogin={handleLogin} />}
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
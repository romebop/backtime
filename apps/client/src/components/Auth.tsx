import React, { useEffect } from 'react';
import styled from 'styled-components';

import { GOOGLE_AUTH_SCOPES } from '../util/constants';
import { UserData } from '@backtime/types';

interface AuthProps {
  handleLogin: (userData: UserData) => void;
}

const Auth: React.FC<AuthProps> = ({ handleLogin }) => {

  const handleAuthCodeResponse = async (code: string) => {
    try {
      const res = await fetch('/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMessage = await res.json();
        throw new Error(`(${res.status}) ${errorMessage}`);
      }
      console.log('auth successful:', JSON.stringify(data.userData));
      handleLogin(data.userData);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const initGoogle = () => {
      if (window.google) {
        const codeClient = window.google.accounts.oauth2.initCodeClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: GOOGLE_AUTH_SCOPES,
          callback: (response: any) => {
            if (response.code) {
              handleAuthCodeResponse(response.code);
            }
          },
        });

        const authButton = document.getElementById('google-signin-button');
        if (authButton) {
          authButton.onclick = () => codeClient.requestCode();
        }
      } else {
        setTimeout(initGoogle, 100);
      }
    };
    initGoogle();
  }, [handleLogin]);

  return (
    <Container>
      <button id="google-signin-button">Sign in with Google</button>
      <Emoji>( ´ ▽ ` )ﾉ</Emoji>
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

export default Auth;
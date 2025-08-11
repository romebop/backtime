import React, { useEffect } from 'react';
import styled from 'styled-components';

import { UserData } from '@backtime/types';
import { GOOGLE_AUTH_SCOPES } from '../util/constants';
import axiosInstance, { setAccessToken } from '../util/axiosInstance';

interface AuthProps {
  handleLogin: (userData: UserData) => void;
}

const Auth: React.FC<AuthProps> = ({ handleLogin }) => {

  const handleAuthCodeResponse = async (code: string) => {
    try {
      const res = await axiosInstance.post<{ accessToken: string, user: UserData }>('/auth/google', { code });
      const { accessToken, user } = res.data;
      console.log('auth successful:', JSON.stringify(user));
      setAccessToken(accessToken);
      handleLogin(user);
    } catch (err) {
      void err;
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
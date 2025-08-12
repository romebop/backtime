import React, { useEffect } from 'react';
import styled from 'styled-components';

import { UserData } from '@backtime/types';
import { GOOGLE_AUTH_SCOPES } from '../util/constants';
import axiosInstance, { setAccessToken } from '../util/axiosInstance';

interface AuthProps {
  setUserData: (userData: UserData) => void;
}

const Auth: React.FC<AuthProps> = ({ setUserData }) => {

  const handleAuthCodeResponse = async (code: string) => {
    try {
      const res = await axiosInstance.post<{ accessToken: string, userData: UserData }>('/auth/google', { code });
      const { accessToken, userData } = res.data;
      console.log('auth successful:', JSON.stringify(userData));
      setAccessToken(accessToken);
      setUserData(userData);
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
  }, [setUserData]);

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
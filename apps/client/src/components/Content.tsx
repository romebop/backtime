import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

import LoadingDots from './LoadingDots';

import { User } from '../types/User';

interface ContentProps {
  handleLogout: () => void;
  userData: User | null;
}

const Content: React.FC<ContentProps> = ({ handleLogout, userData }) => {
  const [data, setData] = useState(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/data');
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        const data = await res.json();
        setData(data);
      } catch (error) {
        setErrorMessage((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAuthCodeResponse = async (response: any) => {
    if (response.code) {
      try {
        const res = await fetch('/auth/google-gmail-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: response.code }),
        });
        if (!res.ok) {
          throw new Error(`failed to exchange code: ${res.status}`);
        }
        console.log('gmail access granted and tokens exchanged!');
        // TODO: update UI to reflect Gmail connected status
      } catch (error) {
        console.error('error exchanging auth code:', error);
      }
    }
  };

  const handleConnectGmail = () => {
    // @ts-ignore
    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      ux_mode: 'popup', // or 'redirect'
      callback: handleAuthCodeResponse,
    });
    client.requestCode();
  };

  return (
    <>
      <Container>
        <p>You are logged in!</p>
        <Emoji>( •̀ᄇ• ́)ﻭ✧</Emoji>
      </Container>
      <DataDisplay>
        <h3>user data:</h3>
        <pre>{JSON.stringify(userData, null, 2)}</pre>
      </DataDisplay>
      <button onClick={handleConnectGmail}>Connect Gmail</button>
      <button onClick={() => handleLogout()}>Logout</button>
      {isLoading
        ? <LoadingDots />
        : <>
            {errorMessage && <ErrorDisplay>Error: {errorMessage}</ErrorDisplay>}
            {data && (
              <DataDisplay>
                <h3>fetch from /data:</h3>
                <pre>{JSON.stringify(data, null, 2)}</pre>
              </DataDisplay>
            )}
          </>}
    </>
  );
};

const Container = styled.div`
  display: flex;
  align-items: center;
`;

const Emoji = styled.pre`
  margin-left: 8px;
`;

const ErrorDisplay = styled.div`
  margin-top: 16px;
  color: red;
  font-family: monospace;
`;

const DataDisplay = styled.div`
  margin-top: 16px;
  pre {
    background-color: #f4f4f4;
    padding: 16px;
    border-radius: 4px;
    white-space: pre-wrap;
    word-break: break-all;
  }
`;

export default Content;

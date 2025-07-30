import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

import { UserData } from '@backtime/types';
import LoadingDots from './LoadingDots';


interface ContentProps {
  handleLogout: () => void;
  userData: UserData | null;
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

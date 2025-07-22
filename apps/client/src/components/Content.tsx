import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

import { apiFetch } from '../utils/apiFetch';

interface ContentProps {
  handleLogOut: () => void;
}

const Content: React.FC<ContentProps> = ({ handleLogOut }) => {
  const [userData, setUserData] = useState<object | null>(null);
  const [data, setData] = useState(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUserData(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiFetch('/data');
        setData(response);
      } catch (error) {
        setErrorMessage((error as Error).message);
      }
    };                                                                         
    fetchData();       
  }, []);

  const logout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    handleLogOut();
    window.location.href = '/'; 
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
      <button onClick={() => logout()}>Logout</button>
      {errorMessage && <ErrorDisplay>Error: {errorMessage}</ErrorDisplay>}
      {data && (
        <DataDisplay>
          <h3>fetch from /data:</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </DataDisplay>
      )}
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

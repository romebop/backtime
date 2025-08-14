import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

import { UserData } from '@backtime/types';
import LoadingDots from './LoadingDots';
import axiosInstance from '../util/axiosInstance';

interface ContentProps {
  handleLogout: () => void;
  userData: UserData | null;
}

const Content: React.FC<ContentProps> = ({ handleLogout, userData }) => {

  const [data, setData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [gmail, setGmail] = useState(null);
  const [isLoadingGmail, setIsLoadingGmail] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoadingData(true);
      setData(null);
      const res = await axiosInstance.get('/data');
      setData(res.data);
    } catch (err) {
      void err;
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchGmail = async () => {
    console.log('fetch gmail called');
    try {
      setIsLoadingGmail(true);
      setGmail(null);
      const res = await axiosInstance.get('/gmail/message');
      setGmail(res.data);
    } catch (err) {
      void err;
    } finally {
      setIsLoadingGmail(false);
    }
  };


  useEffect(() => {
    fetchData();
    fetchGmail();
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
      <button onClick={handleLogout}>Logout</button>
      {isLoadingData
        ? <LoadingDots />
        : <DataDisplay>
            <h3>fetch from /data:</h3>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </DataDisplay>}
      <button onClick={fetchData}>Fetch Data</button>
      {isLoadingGmail
        ? <LoadingDots />
        : <DataDisplay>
            <h3>fetch from /gmail/message:</h3>
            <pre>{JSON.stringify(gmail, null, 2)}</pre>
          </DataDisplay>}
      <button onClick={fetchGmail}>Fetch Gmail</button>
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

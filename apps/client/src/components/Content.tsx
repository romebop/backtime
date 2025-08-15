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
  const [gmail, setGmail] = useState<{ title: string, body: string } | null>(null);
  const [isLoadingGmail, setIsLoadingGmail] = useState(false);
  const [summary, setSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

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

  const fetchSummary = async () => {
    try {
      setIsLoadingSummary(true);
      setSummary(null);
      const res = await axiosInstance.post('/gemini/summarize', { text: gmail?.body });
      setSummary(res.data);
    } catch (err) {
      void err;
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchGmail();
  }, []);

  return (
    <>
      <MessageContainer>
        <p>You are logged in!</p>
        <Emoji>( •̀ᄇ• ́)ﻭ✧</Emoji>
      </MessageContainer>
      <GridContainer>
        <DataDisplay>
          <Header>1. user data:</Header>
          <pre>{JSON.stringify(userData, null, 2)}</pre>
          <Button onClick={handleLogout}>Logout</Button>
        </DataDisplay>
        <DataDisplay $isLoading={isLoadingData} >
          {isLoadingData
            ? <LoadingDots />
            : <>
                <Header>2. fetch data:</Header>
                <pre>{JSON.stringify(data, null, 2)}</pre>
                <Button onClick={fetchData}>Fetch Data</Button>
              </>}
        </DataDisplay>
        <DataDisplay $isLoading={isLoadingGmail} >
          {isLoadingGmail
            ? <LoadingDots />
            : <>
                <Header>3. fetch e-mail:</Header>
                <pre>{JSON.stringify(gmail, null, 2)}</pre>
                <Button onClick={fetchGmail}>Fetch Gmail</Button>
              </>}
        </DataDisplay>
        <DataDisplay $isLoading={isLoadingSummary} >
          {isLoadingSummary
            ? <LoadingDots />
            : <>
                <Header>4. fetch summary:</Header>
                <pre>{JSON.stringify(summary, null, 2)}</pre>
                <Button onClick={fetchSummary}>Fetch Summary</Button>
              </>}
        </DataDisplay>
      </GridContainer>
    </>
  );
};

const MessageContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
`;

const Emoji = styled.pre`
  margin-left: 8px;
`;

const columnWidth = 500;
const gapLength = 80;
const getWidthByColumns = (columns: number) =>
  (columnWidth * columns) + (gapLength * (columns - 1));
const GridContainer = styled.div`
  display: grid;
  gap: ${gapLength}px;
  grid-template-columns: repeat(4, ${columnWidth}px);
  @media (max-width: ${getWidthByColumns(4)}px) {
    grid-template-columns: repeat(2, ${columnWidth}px);
  }
  @media (max-width: ${getWidthByColumns(2)}px) {
    grid-template-columns: ${columnWidth}px;
  }
`;

const DataDisplay = styled.div<{ $isLoading?: boolean }>`
  aspect-ratio: 1 / 1;
  display: flex;
  flex-direction: column;
  ${({ $isLoading }) => $isLoading
    ? `
        align-items: center;
        justify-content: center;
      `
    : `
        justify-content: space-between;
      `
  }
  overflow: auto;
  border: 1px solid #bbb;
  border-radius: 4px;
  padding: 14px 20px;
  pre {
    background-color: #f4f4f4;
    padding: 16px;
    border-radius: 4px;
    white-space: pre-wrap;
    word-break: break-all;
    overflow: auto;
  }
`;

const Header = styled.div`
  font-size: 18px;
  font-weight: 600;
`;

const Button = styled.button`
  width: 120px;
`;

export default Content;

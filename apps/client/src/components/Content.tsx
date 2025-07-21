import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const Content: React.FC = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) {
        setError('no authentication token found.');
        return;
      }

      try {
        const res = await fetch('/data', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`request failed with status: ${res.status}`);
        }

        const jsonData = await res.json();
        setData(jsonData);
      } catch (err: any) {
        setError(err.message);
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
      {error && <ErrorDisplay>Error: {error}</ErrorDisplay>}
      {data && (
        <DataDisplay>
          <h2>fetch from /data:</h2>
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
  width: 100%;
  pre {
    background-color: #f4f4f4;
    padding: 16px;
    border-radius: 4px;
    white-space: pre-wrap;
    word-break: break-all;
  }
`;

export default Content;

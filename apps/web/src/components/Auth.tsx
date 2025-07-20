import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import LoggedInMessage from './LoggedInMessage';

const Auth: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // check if already logged in (e.g., from a previous session)
    if (localStorage.getItem('jwt')) {
      setIsLoggedIn(true);
    }

    // @ts-ignore
    google.accounts.id.initialize({
      client_id: 'YOUR_GOOGLE_CLIENT_ID', // replace with your actual client id
      callback: handleCredentialResponse,
    });
    // @ts-ignore
    google.accounts.id.renderButton(
      document.getElementById('google-signin-button'),
      { theme: 'outline', size: 'large' }
    );
  }, []);

  const handleCredentialResponse = async (response: any) => {
    console.log('encoded jwt id token: ' + response.credential);
    // send the id token to your backend
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_token: response.credential }),
      });

      const data = await res.json();
      if (res.ok) {
        console.log('authentication successful:', data);
        // store the jwt and user info
        localStorage.setItem('jwt', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setIsLoggedIn(true); // Set logged in status to true
      } else {
        console.error('authentication failed:', data);
      }
    } catch (error) {
      console.error('error sending token to backend:', error);
    }
  };

  return (
    <div>
      {isLoggedIn ? (
        <LoggedInMessage />
      ) : (
        <Container>
          <div id="google-signin-button"></div>
          <pre style={{ marginLeft: '8px' }}>( ´ ▽ ` )ﾉ</pre>
        </Container>
      )}
    </div>
  );
};

const Container = styled.div`
  display: flex;
  align-items: center;
`;

export default Auth;
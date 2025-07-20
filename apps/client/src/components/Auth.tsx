import React, { useEffect } from 'react';
import styled from 'styled-components';

interface AuthProps {
  onLoginSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {

  const handleCredentialResponse = async (resp: any) => {
    
    console.log('encoded jwt: ' + resp.credential);
    
    try {

      const res = await fetch('/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: resp.credential }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log('auth successful:', data);
        localStorage.setItem('jwt', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess();
      
      } else {
        console.error('auth failed:', data);
      }
    } catch (error) {
      
      console.error('error sending token to backend:', error);
      
    }
  };

  useEffect(() => {
    const initGoogle = () => {
      // @ts-ignore
      if (window.google) {
        // @ts-ignore
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });
        // @ts-ignore
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { theme: 'outline', size: 'large' }
        );
      } else {
        setTimeout(initGoogle, 100);
      }
    };
    initGoogle();
  }, [handleCredentialResponse]);

  return (
    <Container>
      <div id="google-signin-button"></div>
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
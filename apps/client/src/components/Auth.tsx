import React from 'react';
import styled from 'styled-components';

import { supabase } from '../lib/supabase';

const Auth: React.FC = () => {

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  return (
    <Container>
      <button onClick={handleSignIn}>Sign in with Google</button>
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

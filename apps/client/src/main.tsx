import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import styled from 'styled-components';
import { User } from '@supabase/supabase-js';

import Content from './components/Content';
import Landing from './components/Landing';
import LoadingDots from './components/LoadingDots';
import { silentGmailRefresh, requestGmailConsent, setGmailToken, clearGmailToken } from './lib/google';
import { supabase } from './lib/supabase';
import { GlobalStyle } from './util/globalStyle';

const App: React.FC = () => {

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // On first sign-in, Supabase returns provider_token in the session
        // Grab it before it disappears (only available right after OAuth redirect)
        if (session?.provider_token) {
          setGmailToken(session.provider_token);
        } else {
          // Return visit — silently refresh Gmail token
          try {
            await silentGmailRefresh();
          } catch {
            // Silent refresh failed — try explicit consent
            try {
              await requestGmailConsent();
            } catch {
              // User denied — app works, just no sync
            }
          }
        }
      }

      setIsLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Capture provider_token on sign-in event
      if (session?.provider_token) {
        setGmailToken(session.provider_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // One click: redirect to Google with profile + Gmail scopes
  const handleSignIn = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        scopes: 'https://www.googleapis.com/auth/gmail.readonly',
        queryParams: {
          access_type: 'online',
          prompt: 'consent',
        },
      },
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearGmailToken();
    setUser(null);
  };

  if (isLoading) {
    return (
      <Wrapper>
        <LoadingDots />
      </Wrapper>
    );
  }

  if (!user) {
    return (
      <Wrapper>
        <Landing onSignIn={handleSignIn} />
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <Content handleLogout={handleLogout} user={user} />
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
`;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalStyle />
    <App />
  </React.StrictMode>,
)

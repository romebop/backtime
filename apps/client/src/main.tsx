import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import styled, { ThemeProvider } from 'styled-components';
import { User } from '@supabase/supabase-js';

import Content from './components/Content';
import Landing from './components/Landing';
import LoadingDots from './components/LoadingDots';
import { silentGmailRefresh, requestGmailConsent, setGmailToken, clearGmailToken } from './lib/google';
import { supabase } from './lib/supabase';
import { GlobalStyle } from './util/globalStyle';
import { lightTheme, darkTheme } from './util/theme';
import { useThemeMode } from './hooks/useThemeMode';

const App: React.FC = () => {

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { mode, toggle: toggleTheme } = useThemeMode(user?.id ?? null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        if (session?.provider_token) {
          setGmailToken(session.provider_token);
        } else {
          try {
            await silentGmailRefresh();
          } catch {
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
      if (session?.provider_token) {
        setGmailToken(session.provider_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    localStorage.removeItem('backtime-theme');
    setUser(null);
  };

  return (
    <ThemeProvider theme={(!isLoading && !user) ? lightTheme : (mode === 'dark' ? darkTheme : lightTheme)}>
      <GlobalStyle />
      <Wrapper>
        {isLoading ? (
          <LoadingDots />
        ) : !user ? (
          <Landing onSignIn={handleSignIn} />
        ) : (
          <>
            <ThemeToggle onClick={toggleTheme} aria-label="Toggle theme">
              {mode === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              )}
            </ThemeToggle>
            <Content handleLogout={handleLogout} user={user} />
          </>
        )}
      </Wrapper>
    </ThemeProvider>
  );
};

const Wrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 32px 24px;
`;

const ThemeToggle = styled.button`
  position: absolute;
  top: 32px;
  right: 32px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  transition: color 0.2s;
  &:hover {
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

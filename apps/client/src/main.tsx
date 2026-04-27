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
  const theme = mode === 'dark' ? darkTheme : lightTheme;

  // Keep <html> in sync with theme so the macOS overscroll bounce matches.
  useEffect(() => {
    document.documentElement.style.backgroundColor = theme.colors.bgPage;
    document.documentElement.style.colorScheme = mode;
  }, [mode, theme]);

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
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      {isLoading ? (
        <LoadingWrapper><LoadingDots /></LoadingWrapper>
      ) : !user ? (
        <Landing onSignIn={handleSignIn} mode={mode} onToggleTheme={toggleTheme} />
      ) : (
        <Content user={user} mode={mode} onToggleTheme={toggleTheme} handleLogout={handleLogout} />
      )}
    </ThemeProvider>
  );
};

const LoadingWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
`;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />,
)

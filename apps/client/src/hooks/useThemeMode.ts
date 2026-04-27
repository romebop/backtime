import { useState, useCallback, useEffect } from 'react';

import { supabase } from '../lib/supabase';

export type ThemeMode = 'light' | 'dark';
const CACHE_KEY = 'backtime-theme';

export const useThemeMode = (userId: string | null) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached === 'dark' ? 'dark' : 'light';
  });

  // Sync from database when user signs in
  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('theme')
        .eq('user_id', userId)
        .maybeSingle();

      if (data?.theme === 'light' || data?.theme === 'dark') {
        setMode(data.theme);
        localStorage.setItem(CACHE_KEY, data.theme);
      }
    };
    load();
  }, [userId]);

  const toggle = useCallback(async () => {
    const next: ThemeMode = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    localStorage.setItem(CACHE_KEY, next);

    if (userId) {
      await supabase.from('user_preferences').upsert({
        user_id: userId,
        theme: next,
      });
    }
  }, [mode, userId]);

  return { mode, toggle };
};

export const lightTheme = {
  colors: {
    bgPage: '#f4f4f5',
    bgSurface: '#e4e4e7',
    bgElevated: '#ffffff',
    border: '#e4e4e7',
    borderHover: '#d4d4d8',
    textPrimary: '#18181b',
    textHeading: '#09090b',
    textSecondary: '#52525b',
    textMuted: '#71717a',
    textDimmed: '#a1a1aa',
    btnPrimaryBg: '#18181b',
    btnPrimaryText: '#fafafa',
    btnPrimaryHover: '#27272a',
    overlay: 'rgba(0, 0, 0, 0.3)',
    inputBg: '#ffffff',
    accentBlue: '#3b82f6',
    accentGreen: '#16a34a',
  },
  banner: {
    syncing: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
    done: { bg: '#f4f4f5', border: '#e4e4e7', text: '#71717a' },
    error: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
  },
  badge: {
    neutral: { bg: '#f4f4f5', text: '#71717a' },
    urgent: { bg: '#fef2f2', text: '#dc2626' },
    warning: { bg: '#fffbeb', text: '#d97706' },
    safe: { bg: '#f0fdf4', text: '#16a34a' },
  },
};

export const darkTheme = {
  colors: {
    bgPage: '#0f1117',
    bgSurface: '#18181b',
    bgElevated: '#1e1e24',
    border: '#27272a',
    borderHover: '#3f3f46',
    textPrimary: '#e4e4e7',
    textHeading: '#fafafa',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    textDimmed: '#52525b',
    btnPrimaryBg: '#e4e4e7',
    btnPrimaryText: '#18181b',
    btnPrimaryHover: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.6)',
    inputBg: '#0f1117',
    accentBlue: '#60a5fa',
    accentGreen: '#4ade80',
  },
  banner: {
    syncing: { bg: '#172554', border: '#1e3a5f', text: '#93c5fd' },
    done: { bg: '#18181b', border: '#27272a', text: '#71717a' },
    error: { bg: '#2a1215', border: '#5f1e1e', text: '#fca5a5' },
  },
  badge: {
    neutral: { bg: '#27272a', text: '#a1a1aa' },
    urgent: { bg: '#3b1a1a', text: '#fca5a5' },
    warning: { bg: '#3b2e1a', text: '#fcd34d' },
    safe: { bg: '#1a3b2a', text: '#86efac' },
  },
};

export type AppTheme = typeof lightTheme;

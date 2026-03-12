// Google Identity Services helpers
// Used for silent Gmail token refresh on return visits
// Initial sign-in uses Supabase OAuth (which handles everything in one redirect)

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

// In-memory Gmail token (never sent to our server)
let gmailAccessToken: string | null = null;

export const getGmailToken = () => gmailAccessToken;
export const setGmailToken = (token: string | null) => { gmailAccessToken = token; };
export const clearGmailToken = () => { gmailAccessToken = null; };

// Wait for Google Identity Services library to load
const waitForGIS = (): Promise<typeof google> => {
  return new Promise((resolve) => {
    if (window.google?.accounts) {
      resolve(window.google);
      return;
    }
    const check = () => {
      if (window.google?.accounts) {
        resolve(window.google);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
};

// Silent Gmail token refresh (no popup if user already granted access)
export const silentGmailRefresh = (): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const gis = await waitForGIS();
    const tokenClient = gis.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GMAIL_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        gmailAccessToken = response.access_token;
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(new Error(error.message || 'Silent refresh failed'));
      },
    });
    tokenClient.requestAccessToken({ prompt: '' });
  });
};

// Explicit Gmail consent (popup, used as fallback when silent refresh fails)
export const requestGmailConsent = (): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const gis = await waitForGIS();
    const tokenClient = gis.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GMAIL_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        gmailAccessToken = response.access_token;
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(new Error(error.message || 'Gmail consent failed'));
      },
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

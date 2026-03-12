interface CredentialResponse {
  credential: string;
  select_by: string;
}

interface PromptNotification {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
  isDismissedMoment(): boolean;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken(config?: { prompt?: string }): void;
}

interface Google {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: CredentialResponse) => void;
        auto_select?: boolean;
      }): void;
      prompt(callback?: (notification: PromptNotification) => void): void;
      renderButton(
        element: HTMLElement,
        config: {
          theme?: string;
          size?: string;
          text?: string;
          width?: number;
        },
      ): void;
      revoke(hint: string, callback?: () => void): void;
    };
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { message?: string }) => void;
      }): TokenClient;
    };
  };
}

declare global {
  interface Window {
    google: Google;
  }
  const google: Google;
}

export {};

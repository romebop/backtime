// Gmail API client — runs in the browser using the user's OAuth access token
// Emails never leave the browser

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

interface GmailMessage {
  id: string;
  threadId: string;
}

interface GmailMessageDetail {
  id: string;
  payload: {
    headers: { name: string; value: string }[];
    parts?: { mimeType: string; body: { data?: string } }[];
    body?: { data?: string };
  };
  internalDate: string;
}

export interface ParsedEmail {
  messageId: string;
  from: string;
  subject: string;
  body: string;
  date: string;
}

const gmailFetch = async (path: string, accessToken: string): Promise<any> => {
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
};

// Search Gmail for emails matching a query
export const searchEmails = async (
  accessToken: string,
  query: string,
  maxResults: number = 50,
): Promise<GmailMessage[]> => {
  const data = await gmailFetch(
    `/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    accessToken,
  );
  return data.messages || [];
};

// Fetch full message details
export const getMessageDetail = async (
  accessToken: string,
  messageId: string,
): Promise<GmailMessageDetail> => {
  return gmailFetch(`/messages/${messageId}`, accessToken);
};

// Extract readable content from a Gmail message
export const parseMessage = (detail: GmailMessageDetail): ParsedEmail => {
  const headers = detail.payload.headers;
  const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
  const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';

  // Extract body text
  let bodyData = '';
  if (detail.payload.parts) {
    const textPart = detail.payload.parts.find(p => p.mimeType === 'text/plain');
    bodyData = textPart?.body?.data || '';
    // Fall back to HTML if no plain text
    if (!bodyData) {
      const htmlPart = detail.payload.parts.find(p => p.mimeType === 'text/html');
      bodyData = htmlPart?.body?.data || '';
    }
  } else if (detail.payload.body?.data) {
    bodyData = detail.payload.body.data;
  }

  // Decode base64url
  const body = bodyData
    ? atob(bodyData.replace(/-/g, '+').replace(/_/g, '/'))
    : '';

  const date = new Date(parseInt(detail.internalDate)).toISOString();

  return { messageId: detail.id, from, subject, body, date };
};

// Fetch and parse multiple emails
export const fetchAndParseEmails = async (
  accessToken: string,
  query: string,
  maxResults: number = 50,
): Promise<ParsedEmail[]> => {
  const messages = await searchEmails(accessToken, query, maxResults);
  const parsed: ParsedEmail[] = [];

  for (const msg of messages) {
    try {
      const detail = await getMessageDetail(accessToken, msg.id);
      parsed.push(parseMessage(detail));
    } catch (err) {
      console.error(`Failed to parse message ${msg.id}:`, err);
    }
  }

  return parsed;
};

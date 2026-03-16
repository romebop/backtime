// Gemini REST API client — runs in the browser
// Uses short-lived OAuth tokens so email text goes directly from browser to Google
// Our server never sees the email content

import type { ParsedEmail } from './gmail';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface ParsedPurchase {
  name: string;
  merchant: string;
  price: number | null;
  purchaseDate: string | null;
  returnByDate: string | null;
  warrantyEndDate: string | null;
  orderNumber: string | null;
}

const PARSE_PROMPT = `You are a receipt parser. Given an email, extract purchase information and return ONLY a JSON object with these fields:
- name: product name (string)
- merchant: store/seller name (string)
- price: total price as a number, or null if not found
- purchaseDate: date of purchase as YYYY-MM-DD, or null
- returnByDate: return deadline as YYYY-MM-DD, or null (estimate based on merchant's typical return policy if not explicit)
- warrantyEndDate: warranty end date as YYYY-MM-DD, or null
- orderNumber: order/confirmation number, or null

If the email is not a purchase receipt, return null.
Return ONLY valid JSON, no markdown, no explanation.`;

// Parse a single email using Gemini REST API with short-lived OAuth token
export const parseEmailWithGemini = async (
  accessToken: string,
  email: ParsedEmail,
): Promise<ParsedPurchase | null> => {
  const emailText = `From: ${email.from}\nSubject: ${email.subject}\nDate: ${email.date}\n\n${email.body}`;

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: PARSE_PROMPT }],
      },
      contents: [{
        role: 'user',
        parts: [{ text: emailText }],
      }],
      generationConfig: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[gemini] API error:', response.status, errorBody);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  try {
    const cleaned = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    if (cleaned === 'null' || !cleaned) {
      return null;
    }

    const parsed: ParsedPurchase = JSON.parse(cleaned);
    return parsed;
  } catch (err) {
    console.error('[gemini] failed to parse response:', responseText);
    return null;
  }
};

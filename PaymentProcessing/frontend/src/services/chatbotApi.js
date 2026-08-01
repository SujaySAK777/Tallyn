const GROQ_MODEL = process.env.REACT_APP_GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY || '';
const GROQ_BASE_URL = process.env.REACT_APP_GROQ_BASE_URL || 'https://api.groq.com/openai/v1';

const SUPPORT_SYSTEM_PROMPT = [
  'You are Tallyn Assistant, a helpful and concise customer support chatbot for a payment platform.',
  'You can help with payments, account checks, transaction tracking, failed payment guidance, and safety best practices.',
  'You cannot perform real account actions, change balances, or access user private data.',
  'When user asks for sensitive operations, provide safe step-by-step instructions and ask them to use official app flows.',
  'If a user issue sounds urgent (fraud, unauthorized transfer), prioritize freeze card/account and contact official support guidance immediately.',
  'Keep answers short and practical with numbered steps where useful.'
].join(' ');

function mapHistoryToGroqMessages(messages) {
  const mapped = [
    {
      role: 'system',
      content: SUPPORT_SYSTEM_PROMPT
    }
  ];

  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') {
      continue;
    }

    mapped.push({
      role: message.role,
      content: message.text
    });
  }

  return mapped;
}

function parseGroqTextResponse(data) {
  const text = data?.choices?.[0]?.message?.content || '';
  return String(text).trim();
}

function normalizeModelName(modelName) {
  return String(modelName || '').trim();
}

function parseGroqError(errorText, statusCode) {
  let parsed;
  try {
    parsed = JSON.parse(errorText);
  } catch {
    return errorText || `Groq request failed with status ${statusCode}`;
  }

  const message = parsed?.error?.message || parsed?.message;

  if (statusCode === 401 || /invalid api key|authentication/i.test(message || '')) {
    return 'Invalid Groq API key. Update REACT_APP_GROQ_API_KEY in .env and restart the frontend.';
  }

  if (statusCode === 403 || /permission|forbidden/i.test(message || '')) {
    return 'Groq access denied for this key. Check API key permissions and project access.';
  }

  if (statusCode === 404 || /model.*not found|does not exist|invalid model/i.test(message || '')) {
    return 'Configured Groq model is unavailable. Set REACT_APP_GROQ_MODEL to a valid Groq model and restart the frontend.';
  }

  return message || `Groq request failed with status ${statusCode}`;
}

export async function sendSupportMessage(history) {
  if (!GROQ_API_KEY) {
    throw new Error('Missing REACT_APP_GROQ_API_KEY in .env file.');
  }

  const modelName = normalizeModelName(GROQ_MODEL);
  if (!modelName) {
    throw new Error('Missing REACT_APP_GROQ_MODEL in .env file.');
  }

  const baseUrl = GROQ_BASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/chat/completions`;

  const payload = {
    model: modelName,
    messages: mapHistoryToGroqMessages(history),
    temperature: 0.4,
    max_tokens: 350
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(parseGroqError(errorText, response.status));
  }

  const data = await response.json();
  const text = parseGroqTextResponse(data);

  if (!text) {
    throw new Error('Groq returned an empty response.');
  }

  return text;
}

export const env = {
  postgresUrl: process.env.POSTGRES_URL,
  blobToken: process.env.BLOB_READ_WRITE_TOKEN,
  qstashToken: process.env.QSTASH_TOKEN,
  qstashUrl: process.env.QSTASH_URL,
  qstashCurrentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  qstashNextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL,
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  githubCallbackUrl: process.env.GITHUB_CALLBACK_URL,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL,
  sessionSecret: process.env.SESSION_SECRET,
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'repro_session',
};

export function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

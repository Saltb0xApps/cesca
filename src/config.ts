import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const config = {
  notion: {
    token: required("NOTION_TOKEN"),
    parentPageId: optional("NOTION_PARENT_PAGE_ID"),
    databaseId: optional("NOTION_DATABASE_ID"),
  },
  cron: {
    secret: optional("CRON_SECRET"),
  },
  linkedin: {
    clientId: optional("LINKEDIN_CLIENT_ID"),
    clientSecret: optional("LINKEDIN_CLIENT_SECRET"),
    accessToken: optional("LINKEDIN_ACCESS_TOKEN"),
    refreshToken: optional("LINKEDIN_REFRESH_TOKEN"),
    tokenExpiresAt: optional("LINKEDIN_TOKEN_EXPIRES_AT"),
    authorUrn: optional("LINKEDIN_AUTHOR_URN"),
  },
  substack: {
    publication: optional("SUBSTACK_PUBLICATION"),
  },
  telegram: {
    botToken: optional("TELEGRAM_BOT_TOKEN"),
    chatId: optional("TELEGRAM_CHAT_ID"),
  },
};

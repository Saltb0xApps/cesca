import "dotenv/config";

function env(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const config = {
  notion: {
    get token() {
      return env("NOTION_TOKEN");
    },
    get parentPageId() {
      return env("NOTION_PARENT_PAGE_ID");
    },
    get databaseId() {
      return env("NOTION_DATABASE_ID");
    },
  },
  cron: {
    get secret() {
      return env("CRON_SECRET");
    },
  },
  linkedin: {
    get clientId() {
      return env("LINKEDIN_CLIENT_ID");
    },
    get clientSecret() {
      return env("LINKEDIN_CLIENT_SECRET");
    },
    get accessToken() {
      return env("LINKEDIN_ACCESS_TOKEN");
    },
    get refreshToken() {
      return env("LINKEDIN_REFRESH_TOKEN");
    },
    get tokenExpiresAt() {
      return env("LINKEDIN_TOKEN_EXPIRES_AT");
    },
    get authorUrn() {
      return env("LINKEDIN_AUTHOR_URN");
    },
  },
  substack: {
    get publication() {
      return env("SUBSTACK_PUBLICATION");
    },
  },
  telegram: {
    get botToken() {
      return env("TELEGRAM_BOT_TOKEN");
    },
    get chatId() {
      return env("TELEGRAM_CHAT_ID");
    },
  },
};

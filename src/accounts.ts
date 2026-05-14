import { config } from "./config";

export interface LinkedInCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  authorUrn: string;
}

export interface Account {
  name: string;
  notionDatabaseId: string;
  linkedin?: LinkedInCredentials;
}

function readEnv(): Account[] {
  const raw = process.env.ACCOUNTS;
  if (raw && raw.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Invalid ACCOUNTS JSON: ${(e as Error).message}`);
    }
    if (!Array.isArray(parsed)) {
      throw new Error("ACCOUNTS must be a JSON array");
    }
    return parsed as Account[];
  }

  if (!config.notion.databaseId) return [];
  const legacy: Account = {
    name: "default",
    notionDatabaseId: config.notion.databaseId,
  };
  if (config.linkedin.accessToken && config.linkedin.authorUrn) {
    legacy.linkedin = {
      accessToken: config.linkedin.accessToken,
      refreshToken: config.linkedin.refreshToken,
      expiresAt: config.linkedin.tokenExpiresAt,
      authorUrn: config.linkedin.authorUrn,
    };
  }
  return [legacy];
}

let cache: Account[] | undefined;

export function getAccounts(): Account[] {
  if (!cache) cache = readEnv();
  return cache;
}

export function findAccount(name: string): Account | undefined {
  return getAccounts().find((a) => a.name === name);
}

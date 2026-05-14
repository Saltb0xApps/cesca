import { config } from "./config";
import { isExpiringSoon, refreshLinkedInToken } from "./linkedin-refresh";
import {
  loadStoredTokens,
  saveStoredTokens,
  type StoredTokens,
} from "./notion/token-store";
import { sendTelegramMessage } from "./notify/telegram";

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

function applyStored(account: Account, stored: StoredTokens): Account {
  const entry = stored[account.name];
  if (!entry || !account.linkedin) return account;
  return {
    ...account,
    linkedin: {
      authorUrn: account.linkedin.authorUrn,
      accessToken: entry.accessToken,
      refreshToken: entry.refreshToken || account.linkedin.refreshToken,
      expiresAt: entry.expiresAt,
    },
  };
}

export async function loadAccountsWithFreshTokens(): Promise<Account[]> {
  const base = getAccounts();
  const storeId = process.env.NOTION_TOKEN_STORE_PAGE_ID;
  if (!storeId) return base;

  const stored = await loadStoredTokens(storeId);
  let dirty = false;
  const out: Account[] = [];

  for (const account of base) {
    let resolved = applyStored(account, stored);
    if (resolved.linkedin && isExpiringSoon(resolved.linkedin)) {
      try {
        const fresh = await refreshLinkedInToken(resolved.linkedin);
        resolved = { ...resolved, linkedin: fresh };
        stored[account.name] = {
          accessToken: fresh.accessToken,
          refreshToken: fresh.refreshToken,
          expiresAt: fresh.expiresAt,
        };
        dirty = true;
      } catch (e) {
        await sendTelegramMessage(
          `❌ <b>LinkedIn token refresh failed</b> · <i>${account.name}</i>\n${(e as Error).message}\nRe-run: <code>npm run oauth:linkedin ${account.name}</code>`,
        );
      }
    }
    out.push(resolved);
  }

  if (dirty) {
    await saveStoredTokens(storeId, stored);
  }
  return out;
}

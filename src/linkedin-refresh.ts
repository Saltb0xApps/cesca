import type { LinkedInCredentials } from "./accounts";
import { config } from "./config";

const REFRESH_THRESHOLD_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isExpiringSoon(creds: LinkedInCredentials): boolean {
  if (!creds.expiresAt) return false;
  const ms = new Date(creds.expiresAt).getTime() - Date.now();
  return ms < REFRESH_THRESHOLD_DAYS * MS_PER_DAY;
}

export async function refreshLinkedInToken(
  creds: LinkedInCredentials,
): Promise<LinkedInCredentials> {
  if (!creds.refreshToken) {
    throw new Error("no refresh_token on file");
  }
  if (!config.linkedin.clientId || !config.linkedin.clientSecret) {
    throw new Error("LINKEDIN_CLIENT_ID/SECRET not set");
  }

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
      client_id: config.linkedin.clientId,
      client_secret: config.linkedin.clientSecret,
    }),
  });
  if (!res.ok) {
    throw new Error(`LinkedIn refresh failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || creds.refreshToken,
    expiresAt: new Date(Date.now() + json.expires_in * 1000).toISOString(),
    authorUrn: creds.authorUrn,
  };
}

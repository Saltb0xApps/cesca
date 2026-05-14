import http from "node:http";
import crypto from "node:crypto";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { config } from "../src/config";

const PORT = 5173;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES =
  "openid profile email w_member_social w_organization_social rw_organization_admin";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

interface OrgAcl {
  organization: string;
  role: string;
}

async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: config.linkedin.clientId!,
      client_secret: config.linkedin.clientSecret!,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

async function fetchUserInfo(accessToken: string) {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`userinfo failed: ${await res.text()}`);
  return (await res.json()) as { sub: string; name?: string; email?: string };
}

async function fetchAdminOrgs(
  accessToken: string,
): Promise<Array<{ urn: string; name: string }>> {
  const url = new URL("https://api.linkedin.com/v2/organizationAcls");
  url.searchParams.set("q", "roleAssignee");
  url.searchParams.set("role", "ADMINISTRATOR");
  url.searchParams.set("state", "APPROVED");
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });
  if (!res.ok) {
    console.warn(
      `Could not list admin organizations (this is fine if you only want a personal profile): ${res.status} ${await res.text()}`,
    );
    return [];
  }
  const json = (await res.json()) as { elements?: OrgAcl[] };
  const acls = json.elements || [];

  const out: Array<{ urn: string; name: string }> = [];
  for (const acl of acls) {
    const orgId = acl.organization.split(":").pop();
    const orgRes = await fetch(
      `https://api.linkedin.com/v2/organizations/${orgId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      },
    );
    let name = orgId || "unknown";
    if (orgRes.ok) {
      const o = (await orgRes.json()) as {
        localizedName?: string;
        vanityName?: string;
      };
      name = o.localizedName || o.vanityName || name;
    }
    out.push({ urn: acl.organization, name });
  }
  return out;
}

async function pickAuthor(
  accessToken: string,
  user: { sub: string; name?: string },
): Promise<{ urn: string; label: string }> {
  const orgs = await fetchAdminOrgs(accessToken);

  console.log("");
  console.log("Available authors:");
  console.log(`  [0] Personal profile (${user.name || user.sub})`);
  orgs.forEach((o, i) => console.log(`  [${i + 1}] ${o.name} (${o.urn})`));

  if (orgs.length === 0) {
    return {
      urn: `urn:li:person:${user.sub}`,
      label: user.name || user.sub,
    };
  }

  const rl = readline.createInterface({ input, output });
  const answer = await rl.question("\nPick which one to use [0]: ");
  rl.close();

  const idx = Number(answer.trim()) || 0;
  if (idx === 0) {
    return {
      urn: `urn:li:person:${user.sub}`,
      label: user.name || user.sub,
    };
  }
  const picked = orgs[idx - 1];
  if (!picked) throw new Error("Invalid selection");
  return { urn: picked.urn, label: picked.name };
}

async function main() {
  const accountName = process.argv[2];
  if (!accountName) {
    throw new Error(
      'Usage: npm run oauth:linkedin <account-name>\n  e.g. npm run oauth:linkedin personal',
    );
  }
  if (!config.linkedin.clientId || !config.linkedin.clientSecret) {
    throw new Error(
      "Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env first.",
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", config.linkedin.clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("state", state);

  console.log("Open this URL in your browser:");
  console.log(authUrl.toString());
  console.log("");

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost:${PORT}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      if (!code || returnedState !== state) {
        res.writeHead(400).end("Missing code or bad state");
        server.close();
        reject(new Error("OAuth failed"));
        return;
      }
      try {
        const token = await exchangeCode(code);
        const user = await fetchUserInfo(token.access_token);

        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK — return to your terminal.");

        const author = await pickAuthor(token.access_token, user);
        const expiresAt = new Date(
          Date.now() + token.expires_in * 1000,
        ).toISOString();

        const entry = {
          name: accountName,
          notionDatabaseId: "PASTE_NOTION_DATABASE_ID_HERE",
          linkedin: {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt,
            authorUrn: author.urn,
          },
        };

        console.log("");
        console.log(`Signed in as: ${author.label} (${author.urn})`);
        console.log("");
        console.log(
          "Add or merge this object into the ACCOUNTS array env var:",
        );
        console.log("");
        console.log(JSON.stringify(entry, null, 2));
        console.log("");
        console.log(
          "Then run `npm run setup:notion -- " +
            accountName +
            "` to create a dedicated Notion DB and fill in notionDatabaseId.",
        );

        server.close();
        resolve();
      } catch (e) {
        res.writeHead(500).end((e as Error).message);
        server.close();
        reject(e);
      }
    });
    server.listen(PORT, () => {
      console.log(`Waiting for callback on ${REDIRECT_URI} ...`);
    });
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

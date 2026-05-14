import http from "node:http";
import crypto from "node:crypto";
import { config } from "../src/config.js";

const PORT = 5173;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = "openid profile email w_member_social";

async function exchangeCode(code: string) {
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
  return (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
  };
}

async function fetchUserInfo(accessToken: string) {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`userinfo failed: ${await res.text()}`);
  return (await res.json()) as { sub: string; name?: string; email?: string };
}

async function main() {
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
        const expiresAt = new Date(
          Date.now() + token.expires_in * 1000,
        ).toISOString();

        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK — you can close this tab.");

        console.log("");
        console.log("Signed in as:", user.name || user.sub);
        console.log("");
        console.log("Add these to .env (and to Vercel project env vars):");
        console.log(`LINKEDIN_ACCESS_TOKEN=${token.access_token}`);
        if (token.refresh_token) {
          console.log(`LINKEDIN_REFRESH_TOKEN=${token.refresh_token}`);
        }
        console.log(`LINKEDIN_TOKEN_EXPIRES_AT=${expiresAt}`);
        console.log(`LINKEDIN_AUTHOR_URN=urn:li:person:${user.sub}`);

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

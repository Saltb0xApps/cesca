// Ariadne — OAuth callback edge function (Supabase / Deno).
//
// Handles the redirect from Google (YouTube) and Meta (Instagram) after the
// user grants access. Exchanges the auth code for tokens and stores them in
// `public.oauth_tokens`.
//
// Deploy:    supabase functions deploy oauth-callback --no-verify-jwt
// Required env (set via `supabase secrets set ...`):
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   META_CLIENT_ID
//   META_CLIENT_SECRET
//   PUBLIC_SITE_URL          e.g. https://ariadne.app
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// The redirect URI configured in Google/Meta consoles must be:
//   {SUPABASE_URL}/functions/v1/oauth-callback?platform=youtube
//   {SUPABASE_URL}/functions/v1/oauth-callback?platform=instagram

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PROVIDERS: Record<string, {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
}> = {
  youtube: {
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientId: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
    clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
  },
  instagram: {
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    clientId: Deno.env.get("META_CLIENT_ID") ?? "",
    clientSecret: Deno.env.get("META_CLIENT_SECRET") ?? "",
  },
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const platform = url.searchParams.get("platform") ?? "youtube";
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // we use this to carry the user_id

  if (!code || !state) return new Response("missing code or state", { status: 400 });

  const cfg = PROVIDERS[platform];
  if (!cfg || !cfg.clientId) return new Response("unknown platform", { status: 400 });

  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/oauth-callback?platform=${platform}`;

  // Exchange code for tokens
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return new Response(`token exchange failed: ${err}`, { status: 400 });
  }
  const tokens = await tokenRes.json();

  // Persist via service role
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
    : null;

  const { error } = await supabase.from("oauth_tokens").upsert({
    user_id: state,
    platform,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_at: expiresAt,
    scopes: tokens.scope ?? null,
    meta: tokens,
  });
  if (error) return new Response(`db error: ${error.message}`, { status: 500 });

  // Send the user back to the app with a success flag
  return Response.redirect(
    `${Deno.env.get("PUBLIC_SITE_URL")}/app.html?connected=${platform}`,
    302
  );
});

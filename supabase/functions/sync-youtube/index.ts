// Ariadne — YouTube sync edge function (Supabase / Deno).
//
// For every user with a stored YouTube OAuth token, fetches their channel
// stats and inserts a snapshot into `public.platform_snapshots`.
//
// Schedule daily via pg_cron:
//   select cron.schedule(
//     'sync-youtube-daily',
//     '0 4 * * *',
//     $$ select net.http_post(
//          'https://<your-project>.functions.supabase.co/sync-youtube',
//          headers => '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
//        ); $$
//   );
//
// Required env:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET   (for refreshing tokens)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: rows, error } = await supabase
    .from("oauth_tokens")
    .select("*")
    .eq("platform", "youtube");
  if (error) return new Response(error.message, { status: 500 });

  let synced = 0;
  for (const row of rows ?? []) {
    let accessToken = row.access_token as string;

    // Refresh if expired
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now() + 60_000) {
      const refreshed = await refreshGoogleToken(row.refresh_token);
      if (!refreshed) continue;
      accessToken = refreshed.access_token;
      await supabase.from("oauth_tokens").update({
        access_token: refreshed.access_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      }).match({ user_id: row.user_id, platform: "youtube" });
    }

    // Pull channel stats: subscribers + view count
    const ytRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!ytRes.ok) continue;
    const yt = await ytRes.json();
    const stats = yt.items?.[0]?.statistics;
    if (!stats) continue;

    await supabase.from("platform_snapshots").insert({
      user_id: row.user_id,
      platform: "youtube",
      followers: Number(stats.subscriberCount ?? 0),
      views:     Number(stats.viewCount ?? 0),
      posts:     Number(stats.videoCount ?? 0),
      source:    "youtube_api",
      raw:       stats,
    });
    synced++;
  }

  return new Response(JSON.stringify({ synced }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function refreshGoogleToken(refreshToken: string | null) {
  if (!refreshToken) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  return await res.json() as { access_token: string; expires_in: number };
}

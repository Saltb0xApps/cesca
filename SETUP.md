# Ariadne — setup guide

The site runs **with no setup at all** — open `index.html` and the prototype works
end-to-end against `localStorage`. Backend sync, real OAuth, and push notifications
require the steps below, and they are additive: enable each piece when you're ready.

---

## 1. Run locally (no setup needed)

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Click "Try the prototype" to walk through the discovery flow. Your answers
persist in `localStorage`. The Trajectory view becomes useful once you do
your first weekly check-in and log platform numbers.

---

## 2. Enable backend sync (Supabase)

### 2a. Create the Supabase project
1. Go to <https://supabase.com>, create a new project. Region: closest to your
   users.
2. In the SQL editor, run the migration in `supabase/migrations/0001_init.sql`
   (or use the Supabase CLI: `supabase db push`).
3. In **Auth → URL configuration**, add `http://localhost:8000` (and your
   production URL) under **Site URL** and **Redirect URLs**.
4. In **Auth → Email**, customize the magic-link template with the Ariadne
   wording.

### 2b. Plug into the frontend
Open `config.js` and paste in your project values:

```js
window.ARIADNE_CONFIG = {
  supabaseUrl: "https://xxxx.supabase.co",
  supabaseAnonKey: "ey...your-anon-key...",
  vapidPublicKey: "" // skip until step 4
};
```

That's it — once a user signs in, their state syncs to `brand_maps` and follows
them across devices. The waitlist form on the landing page also writes to the
`waitlist` table.

> Note: the current `app.js` has the Supabase sync path stubbed but the
> magic-link sign-in modal is not wired into the UI yet. To enable: import the
> Supabase JS SDK and call `supabase.auth.signInWithOtp({ email })` from a sign-in
> button. The state-sync layer is ready to receive `state.userId` once auth is in.

---

## 3. Connect YouTube (first real integration)

### 3a. Google Cloud Console
1. Create a Google Cloud project.
2. **APIs & Services → Library** → enable the **YouTube Data API v3**.
3. **OAuth consent screen** → external; add your email as a test user.
4. **Credentials → Create Credentials → OAuth client ID** → Web application.
5. Authorized redirect URI:
   `https://<your-project>.supabase.co/functions/v1/oauth-callback?platform=youtube`
6. Save the **client ID** and **client secret**.

### 3b. Deploy the edge functions
```bash
supabase secrets set \
  GOOGLE_CLIENT_ID=...    \
  GOOGLE_CLIENT_SECRET=... \
  PUBLIC_SITE_URL=https://your-site.com

supabase functions deploy oauth-callback --no-verify-jwt
supabase functions deploy sync-youtube
```

### 3c. Schedule the daily sync
In the SQL editor:
```sql
select cron.schedule(
  'sync-youtube-daily',
  '0 4 * * *',
  $$ select net.http_post(
       'https://<your-project>.functions.supabase.co/sync-youtube',
       headers => '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
     ); $$
);
```

### 3d. Build the connect button
Frontend wiring (not yet implemented in `app.js`): on Trajectory view, show a
"Connect YouTube" button when the user has no YouTube tokens. Clicking it
redirects to:

```
https://accounts.google.com/o/oauth2/v2/auth
  ?client_id=<GOOGLE_CLIENT_ID>
  &redirect_uri=<SUPABASE_URL>/functions/v1/oauth-callback?platform=youtube
  &response_type=code
  &scope=https://www.googleapis.com/auth/youtube.readonly
  &access_type=offline
  &prompt=consent
  &state=<USER_ID>
```

The edge function handles the rest.

---

## 4. Connect Instagram (stubbed pending Meta review)

The `oauth-callback` edge function already handles Instagram. To activate:

1. Create a Meta developer app at <https://developers.facebook.com>.
2. Add the **Instagram Graph API** product.
3. Add your callback URL:
   `https://<your-project>.supabase.co/functions/v1/oauth-callback?platform=instagram`
4. Submit for **App Review** with the `instagram_basic` and
   `instagram_manage_insights` permissions. Expect 1–4 weeks.

Until approval, the manual log covers Instagram numbers in the Trajectory view.

---

## 5. Email check-in reminders (Resend)

1. Create a Resend account at <https://resend.com>; add and verify a sending
   domain.
2. `supabase secrets set RESEND_API_KEY=...`
3. (Future edge function `send-checkin-emails` — daily cron pulls users whose
   `nextCheckinAt < now()` and emails them via Resend.)

---

## 6. Web Push (real reminders even with the tab closed)

1. Generate a VAPID keypair:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Paste the **public** key into `config.js` → `vapidPublicKey`.
3. `supabase secrets set VAPID_PRIVATE_KEY=... VAPID_PUBLIC_KEY=...`
4. (Future) on the dashboard, replace the in-tab Notification toggle with a
   `pushManager.subscribe()` call. The subscription is stored in
   `push_subscriptions`. A daily edge function loops users whose check-in is due
   and sends a push.

The service worker (`service-worker.js`) is already wired to display
notifications when push messages arrive.

---

## 7. Optional: Formspree fallback for the waitlist

If you don't want to set up Supabase yet but still want real waitlist signups:

1. Create a free Formspree form at <https://formspree.io>.
2. Open `landing.js` and set `FORMSPREE_ENDPOINT` to your form URL.

The form writes to localStorage *and* the configured endpoint(s). Set both
Formspree and Supabase if you want belt-and-braces.

---

## File map

| Path | What it is |
|---|---|
| `index.html` | Landing page (narrative + waitlist) |
| `app.html` | The actual app (flow / map / trajectory / check-ins) |
| `landing.js`, `landing.css` | Narrative animation + waitlist form |
| `app.js`, `styles.css` | App logic + styles |
| `questions.js` | Question definitions, taxonomy, suggestion engines |
| `config.js` | Per-deploy backend config (paste credentials here) |
| `manifest.webmanifest` | PWA manifest |
| `service-worker.js` | Offline cache + push notification handler |
| `register-sw.js` | Registers the SW + shows the install banner |
| `supabase/migrations/*` | DB schema |
| `supabase/functions/*` | Edge functions (OAuth callback, YouTube sync) |
| `assets/icons/*` | PWA icons |

/* Ariadne — runtime config.
   Plug in your Supabase project here when ready. Until then, the app runs
   100% client-side via localStorage and the backend is no-op'd.

   To enable backend sync, paste the values from your Supabase project:
     - supabaseUrl: project URL (https://xxxx.supabase.co)
     - supabaseAnonKey: the public anon key
*/
window.ARIADNE_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",

  // Optional: Web Push public key for push notifications.
  // Generate with `npx web-push generate-vapid-keys` and store the private
  // half in your edge function env.
  vapidPublicKey: "",
};

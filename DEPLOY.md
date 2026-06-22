# Deploy Margins to Fly.io

This puts Margins online so you can write from your phone, iPad, or any browser
**without your Mac running**. Your essays live on a persistent disk attached to
the app.

## One-time setup

1. **Install the Fly CLI** and sign in:

   ```bash
   brew install flyctl
   fly auth signup        # or: fly auth login
   ```

2. **Create the app** (run this in the project folder). When it detects the
   `Dockerfile` and `fly.toml`, accept copying the existing config. Pick a
   unique app name and a region near you. Say **no** to deploying yet:

   ```bash
   fly launch --no-deploy
   ```

3. **Create the persistent disk** for your `.md` files (1 GB is plenty — that's
   thousands of essays). Use the same region as the app:

   ```bash
   fly volume create margins_data --size 1 --region <your-region>
   ```

4. **Set a password** so only you can get in (the browser will prompt once and
   remember it):

   ```bash
   fly secrets set APP_PASSWORD="choose-a-good-password"
   ```

## Deploy (and re-deploy after changes)

```bash
fly deploy
fly open
```

That's it — `fly open` launches the live URL. On your phone/iPad, open that same
URL, enter the password, and add it to your home screen for an app-like window.

## Notes

- **Cost:** with `min_machines_running = 0`, the app suspends when idle, so you
  pay almost nothing; the first request after a nap takes a few seconds to wake.
  The volume is a few cents a month.
- **Your data:** stored on the Fly volume at `/data`. Back it up any time with
  `fly ssh console` then copy the `.md` files, or snapshot the volume.
- **Updating:** push changes, run `fly deploy` again. The volume (your writing)
  is untouched by deploys.
- **Turn off the password:** `fly secrets unset APP_PASSWORD` (not recommended
  while it's public).

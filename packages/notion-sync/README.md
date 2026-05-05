# @cesca/notion-sync

A tiny CLI for verifying your Notion integration before you paste the same
credentials into the iPad app, plus a `npm run append` command you can pipe
arbitrary text into for one-off uploads.

```bash
npm install
NOTION_TOKEN=secret_xxx NOTION_PAGE_ID=xxxxxxxxxxxx npm run check

echo "hello" | NOTION_TOKEN=... NOTION_PAGE_ID=... npm run append -- "Header"
```

Requires Node 22.6+ (for native TypeScript stripping). No third-party deps —
uses the built-in `fetch`.

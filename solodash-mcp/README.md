# SoloDash MCP (dummy)

A dummy [MCP](https://modelcontextprotocol.io) server exposing fake SoloDash
dashboard data over streamable HTTP, built with Next.js and
[`mcp-handler`](https://www.npmjs.com/package/mcp-handler) for deployment on
Vercel.

## Endpoint

The MCP endpoint lives at `/api/mcp` and requires a bearer token. Connect it
to Claude Code with:

```sh
claude mcp add --transport http solodash https://solodash-dummy.vercel.app/api/mcp \
  --header "Authorization: Bearer <TOKEN>"
```

The expected token is read from the `SOLODASH_MCP_TOKEN` environment variable,
falling back to `solodash-dummy-token` when unset. Set `SOLODASH_MCP_TOKEN` in
the Vercel project settings to change it.

## Tools

| Tool | Description |
| --- | --- |
| `get_dashboard_summary` | Total MRR, active users, project count, open tasks |
| `list_projects` | All projects, optionally filtered by status |
| `get_project_metrics` | Detailed metrics for one project (DAU, churn, ARPU, …) |
| `list_tasks` | Tasks, optionally filtered by status or project |
| `get_revenue_history` | Monthly revenue history for the last 6 months |

All data is hardcoded dummy data — there is no database.

## Development

```sh
npm install
npm run dev
```

Then test with:

```sh
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer solodash-dummy-token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_dashboard_summary","arguments":{}}}'
```

## Deploying to Vercel

Import this repo in Vercel and set the project **Root Directory** to
`solodash-mcp`. No other configuration is required; optionally set
`SOLODASH_MCP_TOKEN` to a secret value.

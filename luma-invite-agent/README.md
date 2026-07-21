# Luma Invite Agent

An AI agent that invites people to your [Luma](https://luma.com) events through the official Luma public API. You talk to it in plain English ("invite jane@example.com and bob@example.com to my hackathon on Friday"); Claude figures out which event you mean, checks who's already on the list, and sends the invites — after asking you to confirm.

## What it can do

- **Find events** on your calendar ("my next event", "the July meetup")
- **Inspect guest lists** — who's going, invited, declined, or waitlisted
- **Send invite emails** (`/v1/events/guests/send-invites`) with an optional personal message (200 chars max)
- **Register guests directly** as "Going" (`/v1/events/guests/add`) when you don't want an accept/decline step
- **Deduplicate** against the existing guest list so people don't get double-invited

Anything that sends email or registers people prompts for a `y/N` confirmation in the terminal first (skip with `--yes`).

## Requirements

1. **Luma Plus subscription** — the Luma API is only available on Luma Plus.
2. **Luma API key** — in Luma, open your calendar → Settings → Options → API Keys and create a key.
3. **Anthropic API key** — from [platform.claude.com](https://platform.claude.com).
4. Python 3.10+

## Setup

```bash
cd luma-invite-agent
pip install -r requirements.txt

export LUMA_API_KEY="secret-..."          # from your Luma calendar settings
export ANTHROPIC_API_KEY="sk-ant-..."     # from platform.claude.com
```

## Usage

Interactive chat:

```bash
python agent.py
```

```
Connected to Luma as Akhil

you> who's coming to my next event?
you> invite priya@example.com and Dev Patel <dev@example.com>, say "would love to see you there!"
>>> Send Luma invites for event evt-abc123 to 2 recipient(s): priya@example.com, dev@example.com with message "would love to see you there!" — proceed? [y/N] y
```

One-shot:

```bash
python agent.py "Invite everyone in this list to my next event: a@x.com, b@y.com, c@z.com"
python agent.py --yes "Invite a@x.com to evt-abc123"   # no confirmation prompt
```

## How it works

- `luma_client.py` — thin wrapper over `https://public-api.luma.com` (auth via the `x-luma-api-key` header, automatic retry on 429 rate limits).
- `agent.py` — defines six tools with the Anthropic SDK's `@beta_tool` decorator and runs them through the tool runner (`client.beta.messages.tool_runner`), which handles the agentic loop: Claude calls tools, reads results, and keeps going until the task is done. Model: `claude-opus-4-8` with adaptive thinking.

| Tool | Luma endpoint |
|---|---|
| `get_self` | `GET /v1/users/get-self` |
| `list_events` | `GET /v1/calendars/events/list` |
| `get_event` | `GET /v1/events/get` |
| `list_guests` | `GET /v1/events/guests/list` |
| `send_invites` | `POST /v1/events/guests/send-invites` |
| `add_guests` | `POST /v1/events/guests/add` |

**Invite vs. add:** `send_invites` emails an invitation the recipient accepts or declines. `add_guests` registers them immediately with status "Going" and skips the invite step — the agent only uses it when you explicitly ask to *add* or *register* someone.

## Extending it

The Luma API also supports creating events, coupons, ticket types, contact imports, and webhooks — full spec at `https://public-api.luma.com/openapi.json` and docs at [docs.luma.com](https://docs.luma.com/reference/getting-started-with-your-api). To give the agent a new capability, add a method to `LumaClient`, wrap it in a `@beta_tool` function in `agent.py`, and append it to `TOOLS`.

# Luma Invite Agent

An AI agent that finds people worth inviting and invites them to your [Luma](https://luma.com) events through the official Luma public API. You talk to it in plain English ("find physical AI founders in SF and invite them to my demo night"); Claude researches the scene, finds emails, checks who's already on the list, and sends the invites — after asking you to confirm.

## What it can do

- **Find events** on your calendar ("my next event", "the July meetup")
- **Inspect guest lists** — who's going, invited, declined, or waitlisted
- **Research a scene** with built-in web search — companies, labs, recent demo-day and meetup speakers matching a description like "physical AI in SF"
- **Find people and their emails** via [Apollo.io](https://apollo.io) — search by title/keyword/location, then reveal work emails for the people you approve
- **Send invite emails** (`/v1/events/guests/send-invites`) with an optional personal message (200 chars max)
- **Register guests directly** as "Going" (`/v1/events/guests/add`) when you don't want an accept/decline step
- **Deduplicate** against the existing guest list so people don't get double-invited

Anything that sends email or registers people prompts for a `y/N` confirmation in the terminal first (skip with `--yes`). The agent also presents its candidate list for your approval **before** revealing emails (each Apollo reveal costs credits) and before inviting anyone.

## Requirements

1. **Luma Plus subscription** — the Luma API is only available on Luma Plus.
2. **Luma API key** — in Luma, open your calendar → Settings → Options → API Keys and create a key.
3. **Anthropic API key** — from [platform.claude.com](https://platform.claude.com).
4. **Apollo.io API key** *(optional — needed for finding people/emails)* — from app.apollo.io → Settings → Integrations → API. Email reveals consume 1–9 Apollo credits per person. Without this key the agent still works in Luma-only mode.
5. Python 3.10+

## Setup

```bash
cd luma-invite-agent
pip install -r requirements.txt

export LUMA_API_KEY="secret-..."          # from your Luma calendar settings
export ANTHROPIC_API_KEY="sk-ant-..."     # from platform.claude.com
export APOLLO_API_KEY="..."               # optional: people search + email finding
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
python agent.py "Find ~20 people working on physical AI / robotics in SF (founders and researchers), show me the list, then invite the ones I approve to my next event"
python agent.py --yes "Invite a@x.com to evt-abc123"   # no confirmation prompt
```

A typical prospecting flow:

1. **Research** — the agent web-searches the physical-AI scene in SF (companies like the humanoid/robot-foundation-model startups, lab groups, recent demo-day speakers) to understand who's relevant.
2. **Find people** — it queries Apollo with titles/keywords/locations and shows you a table: name, title, company, why they're relevant. *No emails yet.*
3. **You trim the list** — reply with who to keep. Only then does it enrich emails (that's the step that costs Apollo credits).
4. **Invite** — it drafts a short personal message, shows the final recipient list, and sends via Luma after your `y/N`.

## How it works

- `luma_client.py` — thin wrapper over `https://public-api.luma.com` (auth via the `x-luma-api-key` header, automatic retry on 429 rate limits).
- `people_finder.py` — Apollo.io client: people search (`/v1/mixed_people/api_search`, falling back to `/v1/mixed_people/search` for older master keys) and email enrichment (`/v1/people/match`, work emails only).
- `agent.py` — defines eight tools with the Anthropic SDK's `@beta_tool` decorator plus Claude's server-side `web_search` tool, and runs them through the tool runner (`client.beta.messages.tool_runner`), which handles the agentic loop: Claude calls tools, reads results, and keeps going until the task is done. Model: `claude-opus-4-8` with adaptive thinking. Long web-search turns that pause (`stop_reason: "pause_turn"`) are resumed automatically.

| Tool | Backend |
|---|---|
| `get_self` | Luma `GET /v1/users/get-self` |
| `list_events` | Luma `GET /v1/calendars/events/list` |
| `get_event` | Luma `GET /v1/events/get` |
| `list_guests` | Luma `GET /v1/events/guests/list` |
| `send_invites` | Luma `POST /v1/events/guests/send-invites` |
| `add_guests` | Luma `POST /v1/events/guests/add` |
| `find_people` | Apollo `POST /v1/mixed_people/api_search` |
| `find_email` | Apollo `POST /v1/people/match` |
| `web_search` | Claude server-side web search (no extra key) |

**Invite vs. add:** `send_invites` emails an invitation the recipient accepts or declines. `add_guests` registers them immediately with status "Going" and skips the invite step — the agent only uses it when you explicitly ask to *add* or *register* someone.

## A note on cold outreach

These are people who didn't ask to hear from you. The agent is prompted to keep lists small and genuinely relevant, to tell you where each contact came from, and to suggest an invite message that's honest about how they were found — but the reputation on the line is yours. Targeted, personal invites to people who'd plausibly want to attend land well; bulk blasts get your event (and calendar) marked as spam. Check local email/privacy rules (e.g. CAN-SPAM, GDPR if any recipients are in the EU) if you scale this up.

## Extending it

The Luma API also supports creating events, coupons, ticket types, contact imports, and webhooks — full spec at `https://public-api.luma.com/openapi.json` and docs at [docs.luma.com](https://docs.luma.com/reference/getting-started-with-your-api). To give the agent a new capability, add a method to `LumaClient`, wrap it in a `@beta_tool` function in `agent.py`, and append it to `TOOLS`.

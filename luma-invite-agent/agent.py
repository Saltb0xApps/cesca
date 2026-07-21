"""AI agent that invites people to Luma events through the Luma public API.

Claude drives the conversation and decides which Luma API calls to make;
the SDK tool runner executes them. Anything that sends email (invites) or
registers people (add guests) asks for confirmation in the terminal first,
unless you pass --yes.

Usage:
    python agent.py                          # interactive chat
    python agent.py "Invite a@x.com and b@y.com to my next event"
    python agent.py --yes "..."              # skip confirmation prompts
"""

import argparse
import json
import sys

import anthropic
from anthropic import beta_tool

from luma_client import LumaClient, LumaError

MODEL = "claude-opus-4-8"

SYSTEM_PROMPT = """You are a Luma event assistant. You help the user manage guests \
for events on their Luma (lu.ma) calendar: finding events, checking guest lists, \
sending invitations, and registering guests directly.

Guidelines:
- Event IDs start with "evt-". When the user refers to an event by name or date \
("my next event", "the hackathon"), use list_events to find it and confirm which \
one you picked.
- send_invites emails an invitation the recipient can accept or decline. \
add_guests registers people immediately with status "Going" — use it only when \
the user explicitly wants to register people directly, not invite them.
- Before sending invites, restate the event name, the recipient list, and any \
personal message so the user-visible confirmation prompt has full context.
- Deduplicate email lists, and check the existing guest list when it would avoid \
re-inviting people who already registered or were already invited.
- Invite messages are limited to 200 characters.
- If an API call fails, report the actual error rather than guessing."""

# Set by main() from --yes; when False, mutating tools prompt on stdin.
AUTO_CONFIRM = False

luma = LumaClient()


def _confirm(action: str) -> bool:
    if AUTO_CONFIRM:
        return True
    answer = input(f"\n>>> {action} — proceed? [y/N] ").strip().lower()
    return answer in ("y", "yes")


@beta_tool
def get_self() -> str:
    """Get the authenticated Luma user (verifies the API key works)."""
    return json.dumps(luma.get_self())


@beta_tool
def list_events(after: str | None = None, before: str | None = None,
                pagination_cursor: str | None = None) -> str:
    """List events on the user's Luma calendar.

    Args:
        after: Only events starting after this ISO 8601 datetime, e.g. 2026-07-21T00:00:00Z.
        before: Only events starting before this ISO 8601 datetime.
        pagination_cursor: Value of next_cursor from a previous call, to fetch the next page.
    """
    return json.dumps(luma.list_events(after=after, before=before, pagination_cursor=pagination_cursor))


@beta_tool
def get_event(event_id: str) -> str:
    """Get full details for one event, including its registration questions.

    Args:
        event_id: The event ID, usually starting with evt-.
    """
    return json.dumps(luma.get_event(event_id))


@beta_tool
def list_guests(event_id: str, approval_status: str | None = None,
                pagination_cursor: str | None = None) -> str:
    """List the guests of an event, optionally filtered by status.

    Args:
        event_id: The event ID, usually starting with evt-.
        approval_status: Optional filter, one of: approved, session, pending_approval, invited, declined, waitlist.
        pagination_cursor: Value of next_cursor from a previous call, to fetch the next page.
    """
    return json.dumps(luma.list_guests(event_id, approval_status=approval_status,
                                       pagination_cursor=pagination_cursor))


@beta_tool
def send_invites(event_id: str, emails: list[str], message: str | None = None) -> str:
    """Send email invitations to an event. Recipients get an invite they can accept or decline.

    Args:
        event_id: The event ID, usually starting with evt-.
        emails: Email addresses to invite. Entries may be "email@example.com" or "Name <email@example.com>".
        message: Optional personal note included in the invite email (max 200 characters).
    """
    guests = []
    for entry in emails:
        entry = entry.strip()
        if "<" in entry and entry.endswith(">"):
            name, email = entry.rsplit("<", 1)
            guests.append({"email": email[:-1].strip(), "name": name.strip() or None})
        else:
            guests.append({"email": entry})

    summary = f"Send Luma invites for event {event_id} to {len(guests)} recipient(s): " \
              f"{', '.join(g['email'] for g in guests)}"
    if message:
        summary += f' with message "{message}"'
    if not _confirm(summary):
        return json.dumps({"sent": False, "reason": "User declined the confirmation prompt. Do not retry unless asked."})

    result = luma.send_invites(event_id, guests, message=message)
    return json.dumps({"sent": True, "count": len(guests), "api_response": result})


@beta_tool
def add_guests(event_id: str, emails: list[str]) -> str:
    """Register guests directly on an event with status "Going" (no invite email to accept).
    Only use when the user explicitly asks to add/register people rather than invite them.

    Args:
        event_id: The event ID, usually starting with evt-.
        emails: Email addresses to register. Entries may be "email@example.com" or "Name <email@example.com>".
    """
    guests = []
    for entry in emails:
        entry = entry.strip()
        if "<" in entry and entry.endswith(">"):
            name, email = entry.rsplit("<", 1)
            guests.append({"email": email[:-1].strip(), "name": name.strip() or None})
        else:
            guests.append({"email": entry})

    summary = f"Register {len(guests)} guest(s) as Going on event {event_id}: " \
              f"{', '.join(g['email'] for g in guests)}"
    if not _confirm(summary):
        return json.dumps({"added": False, "reason": "User declined the confirmation prompt. Do not retry unless asked."})

    result = luma.add_guests(event_id, guests)
    return json.dumps({"added": True, "count": len(guests), "api_response": result})


TOOLS = [get_self, list_events, get_event, list_guests, send_invites, add_guests]


def run_turn(client: anthropic.Anthropic, messages: list) -> None:
    """Run one agentic turn: Claude may make several tool calls before answering."""
    runner = client.beta.messages.tool_runner(
        model=MODEL,
        max_tokens=16000,
        thinking={"type": "adaptive"},
        system=SYSTEM_PROMPT,
        tools=TOOLS,
        messages=messages,
    )
    for message in runner:
        for block in message.content:
            if block.type == "text":
                print(block.text)
        # Mirror history so the conversation continues across turns
        messages.append({"role": "assistant", "content": message.content})
        tool_response = runner.generate_tool_call_response()
        if tool_response is not None:
            messages.append(tool_response)


def main() -> None:
    global AUTO_CONFIRM
    parser = argparse.ArgumentParser(description="AI agent for inviting people to Luma events")
    parser.add_argument("prompt", nargs="*", help="One-shot request; omit for interactive chat")
    parser.add_argument("--yes", "-y", action="store_true",
                        help="Skip confirmation prompts before sending invites / adding guests")
    args = parser.parse_args()
    AUTO_CONFIRM = args.yes

    client = anthropic.Anthropic()
    messages: list = []

    try:
        me = luma.get_self()
        print(f"Connected to Luma as {me.get('name') or me.get('email', 'unknown user')}\n")
    except LumaError as e:
        sys.exit(f"Luma API check failed: {e}")

    if args.prompt:
        messages.append({"role": "user", "content": " ".join(args.prompt)})
        run_turn(client, messages)
        return

    print('Interactive mode — describe what you want, e.g. "invite jane@example.com to my next event".')
    print("Ctrl-D or 'quit' to exit.\n")
    while True:
        try:
            user_input = input("you> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not user_input or user_input.lower() in ("quit", "exit"):
            break
        messages.append({"role": "user", "content": user_input})
        run_turn(client, messages)
        print()


if __name__ == "__main__":
    main()

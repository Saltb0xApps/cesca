"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LinkedInPreview from "./linkedin-preview";
import MediaUploader, { type UploadedMedia } from "./media-uploader";
import { useToast } from "./toast";

interface Account {
  name: string;
  hasLinkedIn: boolean;
  authorUrn: string | null;
  isOrganization: boolean;
}

const LINKEDIN_LIMIT = 3000;

interface Props {
  onCreated?: (id: string) => void;
}

export default function Composer({ onCreated }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [account, setAccount] = useState<string>("");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d: { accounts: Account[] }) => {
        const linked = d.accounts.filter((a) => a.hasLinkedIn);
        setAccounts(linked);
        if (linked.length && !account) setAccount(linked[0].name);
      })
      .catch(() => {});
  }, [account]);

  const chars = body.length;
  const charClass =
    chars > LINKEDIN_LIMIT ? "over" : chars > LINKEDIN_LIMIT * 0.9 ? "warn" : "";

  const canSubmit = useMemo(
    () => account && body.trim().length > 0 && chars <= LINKEDIN_LIMIT,
    [account, body, chars],
  );

  async function submit(kind: "draft" | "schedule" | "publish") {
    if (!canSubmit) return;
    setSaving(kind);
    try {
      const status = kind === "draft" ? "Draft" : "Ready to publish";
      const scheduledFor =
        kind === "schedule" && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null;

      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: account,
          name: name || body.slice(0, 60),
          status,
          platforms: ["linkedin"],
          scheduledFor,
          defaultCaption: body,
          linkedinBody: body,
          media: media.map((m) => ({
            name: m.name,
            fileUploadId: m.fileUploadId,
          })),
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        toast(b.error || `HTTP ${res.status}`, "error");
        return;
      }
      const { id } = (await res.json()) as { id: string };

      if (kind === "publish") {
        toast("Publishing to LinkedIn…", "info");
        const pubRes = await fetch(
          `/api/rows/${id}/publish?account=${encodeURIComponent(account)}`,
          { method: "POST" },
        );
        if (!pubRes.ok) {
          const b = await pubRes.json().catch(() => ({}));
          toast(b.error || "Publish failed", "error");
        } else {
          toast("Published!", "success");
        }
      } else if (kind === "schedule") {
        toast("Scheduled", "success");
      } else {
        toast("Saved as draft", "success");
      }

      onCreated?.(id);
      if (kind !== "draft") router.push("/board");
      else {
        setName("");
        setBody("");
        setMedia([]);
        setScheduledAt("");
      }
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  const currentAccount = accounts.find((a) => a.name === account);
  const authorLabel = currentAccount
    ? currentAccount.isOrganization
      ? `${currentAccount.name} (page)`
      : currentAccount.name
    : "Your account";

  return (
    <div className="compose-grid">
      <div className="card compose-form">
        <div className="field">
          <label>Account</label>
          {accounts.length === 0 ? (
            <div className="helper">
              No LinkedIn accounts configured. Add one via <code>npm run oauth:linkedin &lt;name&gt;</code>.
            </div>
          ) : (
            <select value={account} onChange={(e) => setAccount(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                  {a.isOrganization ? " (page)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="field">
          <label>Title (internal — how you find it in Notion)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Product launch teaser"
          />
        </div>

        <div className="field">
          <label>Post body</label>
          <textarea
            className="body-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write what you want to share…"
          />
          <div className={`char-counter ${charClass}`}>
            {chars.toLocaleString()} / {LINKEDIN_LIMIT.toLocaleString()}
          </div>
        </div>

        <div className="field">
          <label>Media</label>
          <MediaUploader files={media} onChange={setMedia} />
        </div>

        <div className="field">
          <label>Schedule (leave empty to publish immediately)</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        <div className="compose-actions">
          <button
            className="btn btn-ghost"
            onClick={() => submit("draft")}
            disabled={!canSubmit || !!saving}
            type="button"
          >
            {saving === "draft" ? "Saving…" : "Save as draft"}
          </button>
          {scheduledAt && (
            <button
              className="btn"
              onClick={() => submit("schedule")}
              disabled={!canSubmit || !!saving}
              type="button"
            >
              {saving === "schedule" ? "Scheduling…" : "Schedule"}
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => submit("publish")}
            disabled={!canSubmit || !!saving}
            type="button"
          >
            {saving === "publish" ? "Publishing…" : "Publish now"}
          </button>
        </div>
      </div>

      <LinkedInPreview
        authorName={authorLabel}
        body={body}
        media={media.map((m) => ({ previewUrl: m.previewUrl }))}
      />
    </div>
  );
}

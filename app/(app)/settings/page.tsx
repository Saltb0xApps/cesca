import { getAccounts } from "../../../src/accounts";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.round((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return `${d.toLocaleDateString()} (${days >= 0 ? `in ${days}d` : `${-days}d ago`})`;
}

export default function SettingsPage() {
  const accounts = getAccounts();

  return (
    <>
      <div className="main-header">
        <h1 className="page-title">Settings</h1>
      </div>
      <div className="main-content">
        <div className="settings-grid">
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Accounts</h3>
              {accounts.length === 0 ? (
                <p className="muted">
                  No accounts configured. Set <code>ACCOUNTS</code> in your env, or run{" "}
                  <code>npm run oauth:linkedin &lt;name&gt;</code>.
                </p>
              ) : (
                accounts.map((a) => (
                  <div key={a.name} style={{ marginBottom: 20 }}>
                    <h4 style={{ marginBottom: 8 }}>{a.name}</h4>
                    <div className="settings-row">
                      <span className="settings-key">Notion DB</span>
                      <span className="settings-value">{a.notionDatabaseId}</span>
                    </div>
                    <div className="settings-row">
                      <span className="settings-key">LinkedIn</span>
                      <span className="settings-value">
                        {a.linkedin ? a.linkedin.authorUrn : "not connected"}
                      </span>
                    </div>
                    <div className="settings-row">
                      <span className="settings-key">Token expires</span>
                      <span className="settings-value">{formatDate(a.linkedin?.expiresAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Adding another account</h3>
              <ol style={{ paddingLeft: 20, color: "var(--text-dim)" }}>
                <li>
                  <code>npm run setup:notion -- &lt;name&gt;</code> — creates a dedicated Notion DB
                </li>
                <li>
                  <code>npm run oauth:linkedin &lt;name&gt;</code> — connects a LinkedIn profile or company page
                </li>
                <li>Merge the printed JSON into the <code>ACCOUNTS</code> env var</li>
                <li>Redeploy</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

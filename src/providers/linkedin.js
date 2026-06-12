import fs from 'fs';

const STORE_FILE = './data/linkedin.json';
const BASE = 'https://www.linkedin.com';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * LinkedIn messaging via the unofficial Voyager API, authenticated with the
 * user's own `li_at` browser cookie (copied from a logged-in session).
 * Contacts are resolved from a profile URL or public identifier — LinkedIn's
 * people search is too volatile to depend on.
 */
export class LinkedInProvider {
  constructor() {
    this.state = { status: 'disconnected', account: null };
    this.cookies = null;
  }

  isReady() {
    return this.state.status === 'ready';
  }

  /** Reconnect with the cookie saved from a previous session, if any. */
  async restore() {
    try {
      const saved = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
      if (saved.liAt) await this.connect(saved.liAt);
    } catch (err) {
      if (err.code !== 'ENOENT') console.log('LinkedIn restore failed:', err.message);
    }
  }

  async connect(liAt) {
    liAt = liAt.trim().replace(/^li_at=/, '').replace(/;.*$/, '');
    if (!liAt) throw new Error('Paste the value of the li_at cookie');

    // LinkedIn issues a JSESSIONID (doubles as the CSRF token) on any page load.
    const res = await fetch(`${BASE}/feed/`, {
      headers: { cookie: `li_at=${liAt}`, 'user-agent': UA },
      redirect: 'manual',
    });
    let jsession = null;
    for (const c of res.headers.getSetCookie?.() || []) {
      const m = c.match(/JSESSIONID="?([^";]+)"?/);
      if (m) jsession = m[1];
    }
    if (!jsession) {
      throw new Error('Could not start a LinkedIn session — the li_at cookie may be invalid or expired.');
    }
    this.cookies = { liAt, jsession };

    const me = await this.#api('/voyager/api/me');
    const mini = (me.included || []).find((e) => e.firstName) || {};
    const name = [mini.firstName, mini.lastName].filter(Boolean).join(' ');
    this.state = { status: 'ready', account: name || 'connected' };

    fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify({ liAt }));
    console.log(`LinkedIn connected as ${this.state.account}`);
  }

  async #api(pathname, opts = {}) {
    const { liAt, jsession } = this.cookies;
    const res = await fetch(BASE + pathname, {
      ...opts,
      headers: {
        cookie: `li_at=${liAt}; JSESSIONID="${jsession}"`,
        'csrf-token': jsession,
        'user-agent': UA,
        accept: 'application/vnd.linkedin.normalized+json+2.1',
        'x-restli-protocol-version': '2.0.0',
        ...(opts.body ? { 'content-type': 'application/json' } : {}),
        ...opts.headers,
      },
    });
    if (res.status === 401 || res.status === 403) {
      this.state = { status: 'disconnected', account: null };
      throw new Error('LinkedIn session expired — reconnect with a fresh li_at cookie.');
    }
    if (!res.ok) throw new Error(`LinkedIn API error ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  /**
   * Resolve a contact from a profile URL (linkedin.com/in/xyz) or a public
   * identifier ("xyz"). Free-text name search is intentionally not supported.
   */
  async searchContacts(query) {
    if (!this.isReady()) return [];
    let publicId = query.trim();
    const urlMatch = publicId.match(/linkedin\.com\/in\/([^/?#]+)/i);
    if (urlMatch) publicId = decodeURIComponent(urlMatch[1]);
    if (!publicId || /\s/.test(publicId)) return [];
    try {
      const data = await this.#api(
        `/voyager/api/identity/profiles/${encodeURIComponent(publicId)}/profileView`
      );
      const mini = (data.included || []).find(
        (e) => e.entityUrn && e.entityUrn.includes('fs_miniProfile') && e.firstName
      );
      if (!mini) return [];
      return [
        {
          id: mini.entityUrn.split(':').pop(),
          name: [mini.firstName, mini.lastName].filter(Boolean).join(' '),
          handle: 'linkedin.com/in/' + publicId,
        },
      ];
    } catch {
      return [];
    }
  }

  async findContact(query) {
    return (await this.searchContacts(query))[0] || null;
  }

  async sendMessage(profileId, text) {
    if (!this.isReady()) throw new Error('LinkedIn is not connected');
    const body = {
      keyVersion: 'LEGACY_INBOX',
      conversationCreate: {
        eventCreate: {
          value: {
            'com.linkedin.voyager.messaging.create.MessageCreate': {
              attributedBody: { text, attributes: [] },
              attachments: [],
            },
          },
        },
        recipients: [profileId],
        subtype: 'MEMBER_TO_MEMBER',
      },
    };
    await this.#api('/voyager/api/messaging/conversations?action=create', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

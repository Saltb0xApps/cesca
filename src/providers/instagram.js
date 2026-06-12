import { IgApiClient } from 'instagram-private-api';
import fs from 'fs';

const STORE_FILE = './data/instagram.json';

/**
 * Instagram DMs via instagram-private-api (unofficial). Logs in with
 * username/password once and persists the session so restarts don't
 * trigger fresh logins (which Instagram is suspicious of).
 */
export class InstagramProvider {
  constructor() {
    this.ig = new IgApiClient();
    this.state = { status: 'disconnected', account: null };
  }

  isReady() {
    return this.state.status === 'ready';
  }

  /** Resume the saved session from a previous login, if any. */
  async restore() {
    try {
      const saved = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
      this.ig.state.generateDevice(saved.username);
      await this.ig.state.deserialize(saved.session);
      const me = await this.ig.account.currentUser();
      this.state = { status: 'ready', account: me.username };
      this.#autosave(saved.username);
      console.log(`Instagram session restored as @${me.username}`);
    } catch (err) {
      if (err.code !== 'ENOENT') console.log('Instagram restore failed:', err.message);
    }
  }

  async connect(username, password) {
    username = String(username || '').trim().replace(/^@/, '');
    if (!username || !password) throw new Error('Instagram username and password are required');
    this.ig = new IgApiClient();
    this.ig.state.generateDevice(username);
    try {
      await this.ig.account.login(username, password);
    } catch (err) {
      if (err.name === 'IgCheckpointError') {
        throw new Error(
          'Instagram flagged this login (checkpoint). Open the Instagram app, approve the login attempt, then try again.'
        );
      }
      if (err.name === 'IgLoginTwoFactorRequiredError') {
        throw new Error('This account has two-factor auth enabled, which is not supported yet.');
      }
      throw new Error('Instagram login failed: ' + (err.message || err.name));
    }
    this.state = { status: 'ready', account: username };
    await this.#save(username);
    this.#autosave(username);
    console.log(`Instagram connected as @${username}`);
  }

  #autosave(username) {
    // instagram-private-api rotates session tokens as it goes; persist after every request.
    this.ig.request.end$.subscribe(() => this.#save(username).catch(() => {}));
  }

  async #save(username) {
    const session = await this.ig.state.serialize();
    delete session.constants;
    fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify({ username, session }));
  }

  async searchContacts(query) {
    if (!this.isReady()) return [];
    const q = query.trim().replace(/^@/, '');
    if (!q) return [];
    try {
      const res = await this.ig.user.search(q);
      return (res.users || []).slice(0, 10).map((u) => ({
        id: String(u.pk),
        name: u.full_name || u.username,
        handle: '@' + u.username,
      }));
    } catch {
      return [];
    }
  }

  async findContact(query) {
    return (await this.searchContacts(query))[0] || null;
  }

  async sendMessage(userPk, text) {
    if (!this.isReady()) throw new Error('Instagram is not connected');
    await this.ig.entity.directThread([String(userPk)]).broadcastText(text);
  }
}

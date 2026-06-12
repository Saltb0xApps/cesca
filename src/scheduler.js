import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = './data';
const STORE_FILE = path.join(DATA_DIR, 'messages.json');
const TICK_MS = 15 * 1000;

/**
 * Persistent message scheduler. Scheduled messages are stored in
 * data/messages.json so they survive restarts. A tick loop checks
 * every 15 seconds for messages that are due and sends them.
 */
export class Scheduler {
  constructor(providers) {
    this.providers = providers;
    this.messages = this.#load();
    this.timer = null;
  }

  #load() {
    try {
      return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    } catch {
      return [];
    }
  }

  #save() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(this.messages, null, 2));
  }

  start() {
    this.timer = setInterval(() => this.#tick(), TICK_MS);
  }

  schedule({ provider, chatId, contactName, text, sendAt }) {
    const msg = {
      id: crypto.randomUUID(),
      provider: provider || 'whatsapp',
      chatId,
      contactName,
      text,
      sendAt: new Date(sendAt).toISOString(),
      status: 'pending', // pending | sent | failed
      createdAt: new Date().toISOString(),
      error: null,
    };
    this.messages.push(msg);
    this.#save();
    return msg;
  }

  cancel(id) {
    const idx = this.messages.findIndex((m) => m.id === id && m.status === 'pending');
    if (idx === -1) return false;
    this.messages.splice(idx, 1);
    this.#save();
    return true;
  }

  list() {
    return [...this.messages].sort((a, b) => new Date(a.sendAt) - new Date(b.sendAt));
  }

  async #tick() {
    const now = Date.now();
    const due = this.messages.filter(
      (m) => m.status === 'pending' && new Date(m.sendAt).getTime() <= now
    );
    for (const msg of due) {
      const provider = this.providers[msg.provider || 'whatsapp'];
      // If the platform isn't connected, leave the message pending — it goes
      // out as soon as the connection comes back.
      if (!provider || !provider.isReady()) continue;
      try {
        await provider.sendMessage(msg.chatId, msg.text);
        msg.status = 'sent';
        msg.sentAt = new Date().toISOString();
        console.log(`[${msg.provider}] Sent to ${msg.contactName}: "${msg.text}"`);
      } catch (err) {
        msg.status = 'failed';
        msg.error = String(err.message || err);
        console.error(`[${msg.provider}] Failed to send to ${msg.contactName}:`, err);
      }
      this.#save();
    }
  }
}

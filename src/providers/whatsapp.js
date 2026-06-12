import pkg from 'whatsapp-web.js';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';

const { Client, LocalAuth } = pkg;

/**
 * Wraps the whatsapp-web.js client and exposes connection state,
 * the current QR code (for the web UI), and helpers for sending
 * messages and resolving contacts by name.
 */
export function startWhatsApp() {
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './data/session' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  const state = {
    status: 'starting', // starting | qr | ready | disconnected
    qrDataUrl: null,
  };

  client.on('qr', async (qr) => {
    state.status = 'qr';
    state.qrDataUrl = await QRCode.toDataURL(qr);
    console.log('Scan this QR code with WhatsApp (Settings > Linked Devices):');
    qrcodeTerminal.generate(qr, { small: true });
  });

  client.on('ready', () => {
    state.status = 'ready';
    state.qrDataUrl = null;
    console.log('WhatsApp client is ready.');
  });

  client.on('disconnected', (reason) => {
    state.status = 'disconnected';
    console.log('WhatsApp disconnected:', reason);
  });

  client.initialize();

  return {
    client,
    state,

    isReady() {
      return state.status === 'ready';
    },

    /**
     * Find a contact by (partial) name or phone number.
     * Returns { id, name, number } or null.
     */
    async findContact(query) {
      const matches = await this.searchContacts(query);
      return matches[0] || null;
    },

    async searchContacts(query) {
      const q = query.trim().toLowerCase();
      const digits = q.replace(/[^\d]/g, '');
      const contacts = await client.getContacts();
      const scored = [];
      for (const c of contacts) {
        if (!c.isMyContact && !c.isWAContact) continue;
        if (c.isGroup) continue;
        const name = (c.name || c.pushname || '').toLowerCase();
        const number = c.number || '';
        let score = 0;
        if (name === q) score = 3;
        else if (name.startsWith(q)) score = 2;
        else if (name.includes(q)) score = 1;
        else if (digits.length >= 7 && number.includes(digits)) score = 2;
        if (score > 0) {
          scored.push({
            score,
            id: c.id._serialized,
            name: c.name || c.pushname || number,
            handle: number ? '+' + number : '',
          });
        }
      }
      scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
      return scored.slice(0, 10).map(({ score, ...rest }) => rest);
    },

    async sendMessage(chatId, text) {
      if (!this.isReady()) throw new Error('WhatsApp client is not connected');
      return client.sendMessage(chatId, text);
    },
  };
}

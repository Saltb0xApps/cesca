import express from 'express';
import * as chrono from 'chrono-node';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Parse a free-form command like:
 *   send "hey, let's catch up!" to John next Friday at 6pm
 *   tell Maria "running late" tomorrow 9am
 * Returns { text, contactQuery, sendAt } or throws with a helpful message.
 */
export function parseCommand(input, refDate = new Date()) {
  const original = input.trim();

  // Pull out the quoted message text first, if any.
  let text = null;
  let rest = original;
  const quoted = original.match(/["“]([\s\S]+?)["”]/) || original.match(/'([\s\S]+?)'/);
  if (quoted) {
    text = quoted[1].trim();
    rest = (original.slice(0, quoted.index) + ' ' + original.slice(quoted.index + quoted[0].length)).trim();
  }

  // Parse the date/time from what's left.
  const results = chrono.parse(rest, refDate, { forwardDate: true });
  if (!results.length) {
    throw new Error('Could not find a date/time. Try something like "next Friday at 6pm" or "tomorrow 9am".');
  }
  const dateResult = results[0];
  const sendAt = dateResult.start.date();
  if (!dateResult.start.isCertain('hour')) {
    sendAt.setHours(9, 0, 0, 0); // default to 9am when no time given
  }
  rest = (rest.slice(0, dateResult.index) + ' ' + rest.slice(dateResult.index + dateResult.text.length)).trim();

  // Whatever follows "to <name>" (or "tell <name>") is the contact.
  let contactQuery = null;
  const toMatch = rest.match(/\b(?:to|tell)\s+(.+?)(?:\s+(?:that|saying)\b.*)?$/i);
  if (toMatch) {
    contactQuery = toMatch[1]
      .replace(/[.,!?]+$/, '')
      .replace(/\s+\b(?:on|at|in|by)\b\s*$/i, '') // dangling preposition left after removing the date
      .trim();
    rest = rest.slice(0, toMatch.index).trim();
  }

  // If the message wasn't quoted, use "that ..."/"saying ..." or the leftover words.
  if (!text) {
    const sayMatch = original.match(/\b(?:that|saying)\s+([\s\S]+)$/i);
    if (sayMatch) {
      text = chrono.parse(sayMatch[1], refDate).length
        ? sayMatch[1].replace(results[0]?.text ?? '', '').trim()
        : sayMatch[1].trim();
    }
  }

  if (!contactQuery) {
    throw new Error('Could not find who to send to. Include "to <contact name>".');
  }
  if (!text) {
    throw new Error('Could not find the message. Put it in quotes, e.g. send "hey!" to John friday 6pm.');
  }
  if (sendAt.getTime() <= refDate.getTime()) {
    throw new Error('That time is in the past.');
  }

  return { text, contactQuery, sendAt };
}

export function startServer({ wa, scheduler, port }) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/status', (req, res) => {
    res.json({ status: wa.state.status, qr: wa.state.qrDataUrl });
  });

  app.get('/api/messages', (req, res) => {
    res.json(scheduler.list());
  });

  app.delete('/api/messages/:id', (req, res) => {
    const ok = scheduler.cancel(req.params.id);
    res.status(ok ? 200 : 404).json({ ok });
  });

  app.get('/api/contacts', async (req, res) => {
    if (!wa.isReady()) return res.status(503).json({ error: 'WhatsApp not connected yet' });
    try {
      res.json(await wa.searchContacts(String(req.query.q || '')));
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  // Natural-language scheduling: { command: 'send "hi" to John friday 6pm' }
  app.post('/api/schedule', async (req, res) => {
    if (!wa.isReady()) return res.status(503).json({ error: 'WhatsApp not connected yet' });
    try {
      const { text, contactQuery, sendAt } = parseCommand(String(req.body.command || ''));
      const contact = await wa.findContact(contactQuery);
      if (!contact) {
        return res.status(404).json({ error: `No contact found matching "${contactQuery}"` });
      }
      const msg = scheduler.schedule({
        chatId: contact.id,
        contactName: contact.name,
        text,
        sendAt,
      });
      res.json(msg);
    } catch (err) {
      res.status(400).json({ error: String(err.message || err) });
    }
  });

  // Structured scheduling: { chatId, contactName, text, sendAt }
  app.post('/api/schedule/direct', (req, res) => {
    const { chatId, contactName, text, sendAt } = req.body;
    if (!chatId || !text || !sendAt) {
      return res.status(400).json({ error: 'chatId, text and sendAt are required' });
    }
    const when = new Date(sendAt);
    if (isNaN(when) || when.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'sendAt must be a valid future date/time' });
    }
    res.json(scheduler.schedule({ chatId, contactName: contactName || chatId, text, sendAt: when }));
  });

  app.listen(port, () => {
    console.log(`Web UI running at http://localhost:${port}`);
  });
}

import { startWhatsApp } from './whatsapp.js';
import { Scheduler } from './scheduler.js';
import { startServer } from './server.js';

const PORT = process.env.PORT || 3000;

async function main() {
  const wa = startWhatsApp();
  const scheduler = new Scheduler(wa);
  scheduler.start();
  startServer({ wa, scheduler, port: PORT });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

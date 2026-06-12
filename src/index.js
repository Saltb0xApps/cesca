import { startWhatsApp } from './providers/whatsapp.js';
import { LinkedInProvider } from './providers/linkedin.js';
import { InstagramProvider } from './providers/instagram.js';
import { Scheduler } from './scheduler.js';
import { startServer } from './server.js';

const PORT = process.env.PORT || 3000;

async function main() {
  const providers = {
    whatsapp: startWhatsApp(),
    linkedin: new LinkedInProvider(),
    instagram: new InstagramProvider(),
  };

  // Reconnect LinkedIn/Instagram from saved sessions; don't block startup.
  providers.linkedin.restore();
  providers.instagram.restore();

  const scheduler = new Scheduler(providers);
  scheduler.start();
  startServer({ providers, scheduler, port: PORT });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

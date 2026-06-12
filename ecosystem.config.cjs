module.exports = {
  apps: [
    {
      name: 'whatsapp-scheduler',
      script: 'src/index.js',
      // Restart if it crashes, but back off if it keeps crashing.
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '500M',
      env: {
        PORT: 3000,
      },
    },
  ],
};

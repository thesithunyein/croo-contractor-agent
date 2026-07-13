/** PM2 process file — keep all 3 CROO agents online locally. */
module.exports = {
  apps: [
    {
      name: 'croo-solana',
      cwd: __dirname,
      script: 'dist/specialists/run.js',
      interpreter: 'node',
      env: {
        ENV_FILE: '.env.solana',
        SPECIALIST: 'solana-tx-doctor',
        NODE_ENV: 'production',
      },
      autorestart: true,
      max_restarts: 50,
      restart_delay: 3000,
    },
    {
      name: 'croo-summarizer',
      cwd: __dirname,
      script: 'dist/specialists/run.js',
      interpreter: 'node',
      env: {
        ENV_FILE: '.env.summarizer',
        SPECIALIST: 'summarizer',
        NODE_ENV: 'production',
      },
      autorestart: true,
      max_restarts: 50,
      restart_delay: 3000,
    },
    {
      name: 'croo-contractor',
      cwd: __dirname,
      script: 'dist/provider.js',
      interpreter: 'node',
      env: {
        ENV_FILE: '.env.contractor',
        NODE_ENV: 'production',
      },
      autorestart: true,
      max_restarts: 50,
      restart_delay: 3000,
    },
  ],
};

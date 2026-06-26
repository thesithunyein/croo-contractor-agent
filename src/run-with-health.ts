import { spawn } from 'child_process';

/**
 * Render.com wrapper: start a CAP agent and a health HTTP server.
 *
 * Render free web services require a listening port. This keeps the
 * agent running as a child process and the health server as the main process.
 *
 * Usage:
 *   node dist/run-with-health.js provider
 *   node dist/run-with-health.js solana
 *   node dist/run-with-health.js summarizer
 */
const agent = process.argv[2];

const commands: Record<string, string> = {
  provider: 'npm run provider',
  solana: 'SPECIALIST=solana-tx-doctor npm run specialist:solana',
  summarizer: 'SPECIALIST=summarizer npm run specialist:summarizer',
};

const cmd = commands[agent];
if (!cmd) {
  console.error(`Unknown agent: ${agent}. Use: provider, solana, summarizer`);
  process.exit(1);
}

// Start health server
const health = spawn('node', ['dist/health-server.js'], {
  stdio: 'inherit',
  shell: true,
});

// Start agent and restart it if it crashes so the health port stays alive.
let agentProc = spawn(cmd, { stdio: 'inherit', shell: true });

function startAgent() {
  console.log(`[agent:${agent}] starting...`);
  agentProc = spawn(cmd, { stdio: 'inherit', shell: true });
  agentProc.on('exit', (code) => {
    console.log(`[agent:${agent}] exited with code ${code}`);
    console.log(`[agent:${agent}] restarting in 5s...`);
    setTimeout(startAgent, 5000);
  });
}

function shutdown() {
  health.kill();
  agentProc.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

health.on('exit', (code) => {
  console.log(`[health] exited with code ${code}`);
  agentProc.kill();
  process.exit(code ?? 1);
});

agentProc.on('exit', (code) => {
  console.log(`[agent:${agent}] exited with code ${code}`);
  console.log(`[agent:${agent}] restarting in 5s...`);
  setTimeout(startAgent, 5000);
});

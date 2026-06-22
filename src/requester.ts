import { CrooClient } from './croo/client';
import { loadEnv } from './config';

/**
 * Standalone REQUESTER demo: hire a single specialist directly via CAP.
 *
 * Use this to prove an end-to-end order settles between two of your agents
 * before running the full orchestrator. The requester agent's AA wallet must
 * hold USDC on Base (deposit via the Dashboard).
 *
 * Run: `npm run requester -- "your task here"`
 *   (uses CROO_SDK_KEY = requester agent, CROO_TARGET_SERVICE_ID = provider service)
 */
async function main() {
  const env = loadEnv();
  if (!env.targetServiceId) {
    throw new Error('Set CROO_TARGET_SERVICE_ID to the serviceId you want to hire.');
  }

  const task = process.argv.slice(2).join(' ').trim() || 'analyze data';
  const client = new CrooClient(env);

  console.log(`[requester] hiring service ${env.targetServiceId} for: "${task}"`);
  const result = await client.hire({
    serviceId: env.targetServiceId,
    requirements: { task, goal: task },
    onPaid: (orderId, txHash) =>
      console.log(`[requester] paid order ${orderId} (tx ${txHash ?? 'n/a'})`),
  });

  console.log(`[requester] order ${result.orderId} completed.`);
  console.log('[requester] deliverable:', result.deliverableText);
  process.exit(0);
}

main().catch((err) => {
  console.error('[requester] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});

import { CrooClient } from './croo/client';
import { activeRegistry } from './registry';
import { verifyDelivery } from './verify';
import { buildReport, writeReport } from './report';
import { SubOrderResult } from './types';
import { loadEnv } from './config';

/**
 * Fan-out mode — the composability engine.
 *
 * Hires EVERY agent in the active registry (your specialists + all partner
 * agents from partners.json) for a single goal, verifies each delivery, and
 * writes an A2A network report. This is how you deterministically rack up
 * unique counterparties + settled orders (the 25% score + 10+-orders bonus).
 *
 * Usage: npm run fanout -- "your goal here"
 * Options via env:
 *   FANOUT_TAG=research   only hire agents with this tag
 *   FANOUT_CONCURRENCY=4  max parallel hires (default 3)
 */
async function main() {
  const env = loadEnv();
  const goal = process.argv.slice(2).join(' ').trim() || 'Demonstrate an A2A orchestration via CROO CAP.';
  const tagFilter = (process.env.FANOUT_TAG ?? '').trim();
  const concurrency = Math.max(1, Number(process.env.FANOUT_CONCURRENCY ?? 3));

  let targets = activeRegistry();
  if (tagFilter) targets = targets.filter((e) => e.tags.includes(tagFilter));

  if (targets.length === 0) {
    console.error('[fanout] No agents in registry. Add specialists (.env) or partners (partners.json).');
    process.exit(1);
  }

  console.log(`[fanout] goal: ${goal}`);
  console.log(`[fanout] hiring ${targets.length} agent(s)` + (tagFilter ? ` (tag=${tagFilter})` : ''));

  const client = new CrooClient(env);
  const results: SubOrderResult[] = [];
  let totalUsdcSpent = 0;
  let jobBudgetExceeded = false;

  // Simple concurrency-limited runner.
  const queue = [...targets];
  async function worker() {
    while (queue.length) {
      const entry = queue.shift()!;
      if (entry.priceUsdc > env.maxUsdcPerOrder) {
        results.push(skip(entry.serviceId, `price ${entry.priceUsdc} > MAX_USDC_PER_ORDER`));
        continue;
      }
      if (jobBudgetExceeded || totalUsdcSpent + entry.priceUsdc > env.maxUsdcPerJob) {
        jobBudgetExceeded = true;
        results.push(skip(entry.serviceId, 'MAX_USDC_PER_JOB reached'));
        continue;
      }
      console.log(`[fanout] -> hiring ${entry.name} (${entry.serviceId})`);
      try {
        const hired = await client.hire({
          serviceId: entry.serviceId,
          requirements: { goal, task: goal },
        });
        const v = verifyDelivery(entry, hired.deliverableText);
        totalUsdcSpent += entry.priceUsdc;
        results.push({
          stepId: entry.name,
          serviceId: entry.serviceId,
          orderId: hired.orderId,
          paymentTxHash: hired.paymentTxHash,
          deliverableText: hired.deliverableText,
          parsed: v.parsed,
          verified: v.verified,
          verificationNotes: v.notes,
          resultHash: v.resultHash,
        });
        console.log(`[fanout]    done ${entry.name}: order ${hired.orderId} verified=${v.verified}`);
      } catch (err) {
        results.push({
          stepId: entry.name,
          serviceId: entry.serviceId,
          orderId: '',
          verified: false,
          verificationNotes: [err instanceof Error ? err.message : String(err)],
        });
        console.error(`[fanout]    FAILED ${entry.name}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));

  const report = buildReport(results, totalUsdcSpent);
  const { jsonPath, mdPath } = writeReport(report);

  console.log('\n[fanout] ===== A2A NETWORK REPORT =====');
  console.log(`  settled orders:        ${report.totals.orders}`);
  console.log(`  unique counterparties: ${report.totals.uniqueCounterparties}`);
  console.log(`  verified deliveries:   ${report.totals.verifiedDeliveries}`);
  console.log(`  USDC spent:            ${report.totals.usdcSpent.toFixed(2)}`);
  console.log(`  report: ${jsonPath}`);
  console.log(`          ${mdPath}`);
  process.exit(0);
}

function skip(serviceId: string, reason: string): SubOrderResult {
  return { stepId: serviceId, serviceId, orderId: '', verified: false, verificationNotes: [`Skipped: ${reason}`] };
}

main().catch((err) => {
  console.error('[fanout] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});

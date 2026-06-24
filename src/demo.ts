import { CrooClient } from './croo/client';
import { activeRegistry } from './registry';
import { verifyDelivery } from './verify';
import { buildReport, writeReport } from './report';
import { SubOrderResult } from './types';
import { loadEnv } from './config';

/**
 * Demo script — runs a complete A2A fan-out cycle for video recording.
 *
 * Hires every registered agent sequentially, verifies deliveries, and
 * prints a structured summary suitable for a hackathon demo video.
 *
 * Usage: npm run demo -- "your goal here"
 */
async function main() {
  const env = loadEnv();
  const goal =
    process.argv.slice(2).join(' ').trim() ||
    'Diagnose Solana error 0x1770 and summarize the fix';

  const targets = activeRegistry();
  if (targets.length === 0) {
    console.error('[demo] No agents in registry.');
    process.exit(1);
  }

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          CROO Contractor — A2A Demo                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`  Goal:     ${goal}`);
  console.log(`  Agents:   ${targets.length}`);
  console.log(`  Network:  Base (USDC settlement, gas sponsored)`);
  console.log();

  const results: SubOrderResult[] = [];
  let totalUsdcSpent = 0;

  for (const entry of targets) {
    console.log(`┌─────────────────────────────────────────────────────────┐`);
    console.log(`│ Hiring: ${entry.name.padEnd(44)}│`);
    console.log(`│ Service: ${entry.serviceId.padEnd(42)}│`);
    console.log(`│ Price:   ${(entry.priceUsdc + ' USDC').padEnd(43)}│`);
    console.log(`└─────────────────────────────────────────────────────────┘`);

    try {
      const client = new CrooClient(env);
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

      console.log(`  ✓ Order settled:  ${hired.orderId}`);
      console.log(`  ✓ Payment tx:     ${hired.paymentTxHash}`);
      console.log(`  ✓ Verified:       ${v.verified}`);
      console.log(`  ✓ Deliverable:    ${(hired.deliverableText ?? '').substring(0, 80)}...`);
      console.log();
    } catch (err) {
      results.push({
        stepId: entry.name,
        serviceId: entry.serviceId,
        orderId: '',
        verified: false,
        verificationNotes: [err instanceof Error ? err.message : String(err)],
      });
      console.log(`  ✗ FAILED: ${err instanceof Error ? err.message : err}`);
      console.log();
    }

    if (targets.indexOf(entry) < targets.length - 1) {
      console.log('  Waiting 3s before next hire...');
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  const report = buildReport(results, totalUsdcSpent);
  const { jsonPath, mdPath } = writeReport(report);

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          A2A Network Report                               ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Settled orders:       ${String(report.totals.orders).padEnd(34)}║`);
  console.log(`║  Unique counterparties: ${String(report.totals.uniqueCounterparties).padEnd(33)}║`);
  console.log(`║  Verified deliveries:  ${String(report.totals.verifiedDeliveries).padEnd(34)}║`);
  console.log(`║  USDC spent:           ${report.totals.usdcSpent.toFixed(2).padEnd(34)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`  Report JSON: ${jsonPath}`);
  console.log(`  Report MD:   ${mdPath}`);

  console.log();
  console.log('  Proof Bundle:');
  for (const p of report.proofBundle) {
    console.log(`    • ${p.stepId}: order ${p.orderId} | verified=${p.verified} | hash=${(p.resultHash ?? '').slice(0, 16)}...`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[demo] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});

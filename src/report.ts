import * as fs from 'fs';
import * as path from 'path';
import { SubOrderResult } from './types';

/**
 * A2A network report — the artifact judges and you care about.
 *
 * Aggregates every sub-order the Contractor has run into the metrics that
 * decide the composability (25%) score and the 10+-orders bonus:
 *   - unique counterparty agents (by serviceId)
 *   - total settled orders
 *   - verified-delivery rate
 * Plus a per-order proof bundle (orderId + result hash).
 */
export interface NetworkReport {
  generatedAt: string;
  totals: {
    orders: number;
    uniqueCounterparties: number;
    verifiedDeliveries: number;
    usdcSpent: number;
  };
  counterparties: Array<{ serviceId: string; orders: number }>;
  proofBundle: Array<{
    stepId: string;
    serviceId: string;
    orderId: string;
    verified: boolean;
    resultHash?: string;
    paymentTxHash?: string;
  }>;
}

export function buildReport(subOrders: SubOrderResult[], usdcSpent: number): NetworkReport {
  const byCounterparty = new Map<string, number>();
  for (const s of subOrders) {
    if (s.serviceId && s.orderId) {
      byCounterparty.set(s.serviceId, (byCounterparty.get(s.serviceId) ?? 0) + 1);
    }
  }
  const settled = subOrders.filter((s) => s.orderId);
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      orders: settled.length,
      uniqueCounterparties: byCounterparty.size,
      verifiedDeliveries: subOrders.filter((s) => s.verified).length,
      usdcSpent,
    },
    counterparties: [...byCounterparty.entries()].map(([serviceId, orders]) => ({ serviceId, orders })),
    proofBundle: settled.map((s) => ({
      stepId: s.stepId,
      serviceId: s.serviceId,
      orderId: s.orderId,
      verified: s.verified,
      resultHash: s.resultHash,
      paymentTxHash: s.paymentTxHash,
    })),
  };
}

/** Persist the report to reports/ as JSON + a human-readable markdown summary. */
export function writeReport(report: NetworkReport, dir = 'reports'): { jsonPath: string; mdPath: string } {
  const outDir = path.resolve(process.cwd(), dir);
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'order-graph.json');
  const mdPath = path.join(outDir, 'order-graph.md');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  const md = [
    '# CROO Contractor — A2A Network Report',
    '',
    `_Generated: ${report.generatedAt}_`,
    '',
    '## Totals',
    `- **Settled orders:** ${report.totals.orders}`,
    `- **Unique counterparty agents:** ${report.totals.uniqueCounterparties}`,
    `- **Verified deliveries:** ${report.totals.verifiedDeliveries}`,
    `- **USDC spent:** ${report.totals.usdcSpent.toFixed(2)}`,
    '',
    '## Counterparties',
    ...report.counterparties.map((c) => `- \`${c.serviceId}\` — ${c.orders} order(s)`),
    '',
    '## Proof bundle',
    '| step | serviceId | orderId | verified | resultHash | txHash |',
    '|------|-----------|---------|----------|------------|--------|',
    ...report.proofBundle.map(
      (p) =>
        `| ${p.stepId} | \`${p.serviceId}\` | \`${p.orderId}\` | ${p.verified ? 'yes' : 'no'} | \`${(p.resultHash ?? '').slice(0, 16)}\` | \`${(p.paymentTxHash ?? '').slice(0, 16)}\` |`,
    ),
    '',
  ].join('\n');
  fs.writeFileSync(mdPath, md, 'utf8');

  return { jsonPath, mdPath };
}

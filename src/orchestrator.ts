import { CrooClient } from './croo/client';
import { resolveCapability, activeRegistry } from './registry';
import { planJob } from './planner';
import { verifyDelivery } from './verify';
import { JobPlan, JobResult, PlannedStep, SubOrderResult } from './types';
import { loadEnv } from './config';
import { buildReport, writeReport } from './report';

/**
 * The Contractor orchestration engine.
 *
 * Given a goal (or an explicit plan), it hires specialist agents over CAP,
 * verifies each delivery, enforces spend guardrails, and composes a final
 * result with a tamper-evident proof bundle (order ids + result hashes).
 *
 * This is what makes the agent A2A-composable: a single inbound job fans out
 * into multiple paid sub-orders to diverse counterparties.
 */
export class Orchestrator {
  private client: CrooClient;
  private env = loadEnv();

  constructor(client: CrooClient = new CrooClient()) {
    this.client = client;
  }

  async run(input: { goal: string; steps?: PlannedStep[]; stream?: any }): Promise<JobResult> {
    const plan = planJob(input);
    return this.execute(plan, input.stream);
  }

  async execute(plan: JobPlan, stream?: any): Promise<JobResult> {
    const results = new Map<string, SubOrderResult>();
    let totalUsdcSpent = 0;

    for (const step of this.topoSort(plan.steps)) {
      const entry = resolveCapability(step.capability);
      if (!entry) {
        results.set(step.id, {
          stepId: step.id,
          serviceId: '',
          orderId: '',
          verified: false,
          verificationNotes: [
            `No configured specialist for capability "${step.capability}". ` +
              `Configured: ${activeRegistry().map((e) => e.name).join(', ') || '(none)'}`,
          ],
        });
        continue;
      }

      // Spend guardrails.
      if (entry.priceUsdc > this.env.maxUsdcPerOrder) {
        results.set(step.id, blockedResult(step, entry.serviceId, 'exceeds MAX_USDC_PER_ORDER'));
        continue;
      }
      if (totalUsdcSpent + entry.priceUsdc > this.env.maxUsdcPerJob) {
        results.set(step.id, blockedResult(step, entry.serviceId, 'exceeds MAX_USDC_PER_JOB'));
        continue;
      }

      // Feed upstream outputs into this step's requirements.
      const inputs: Record<string, unknown> = { ...step.requirements };
      for (const dep of step.dependsOn) {
        const upstream = results.get(dep);
        if (upstream?.parsed !== undefined) inputs[`input_${dep}`] = upstream.parsed;
      }

      try {
        const hired = await this.client.hire({
          serviceId: entry.serviceId,
          requirements: inputs,
          stream,
        });
        const v = verifyDelivery(entry, hired.deliverableText);
        totalUsdcSpent += entry.priceUsdc;

        results.set(step.id, {
          stepId: step.id,
          serviceId: entry.serviceId,
          orderId: hired.orderId,
          paymentTxHash: hired.paymentTxHash,
          deliverableText: hired.deliverableText,
          parsed: v.parsed,
          verified: v.verified,
          verificationNotes: v.notes,
          resultHash: v.resultHash,
        });
      } catch (err) {
        results.set(step.id, {
          stepId: step.id,
          serviceId: entry.serviceId,
          orderId: '',
          verified: false,
          verificationNotes: [err instanceof Error ? err.message : String(err)],
        });
      }
    }

    const subOrders = plan.steps.map((s) => results.get(s.id)!).filter(Boolean);
    return {
      goal: plan.goal,
      composed: this.compose(plan, subOrders),
      subOrders,
      totalUsdcSpent,
      proofBundle: subOrders
        .filter((r) => r.orderId)
        .map((r) => ({ stepId: r.stepId, orderId: r.orderId, resultHash: r.resultHash })),
    };
  }

  /** Compose verified sub-results into a single object keyed by step id. */
  private compose(plan: JobPlan, subOrders: SubOrderResult[]) {
    const composed: Record<string, unknown> = { goal: plan.goal };
    for (const r of subOrders) {
      composed[r.stepId] = r.verified ? r.parsed ?? r.deliverableText : { error: r.verificationNotes };
    }
    return composed;
  }

  /** Kahn's algorithm topological sort over step dependencies. */
  private topoSort(steps: PlannedStep[]): PlannedStep[] {
    const byId = new Map(steps.map((s) => [s.id, s]));
    const indegree = new Map(steps.map((s) => [s.id, 0]));
    for (const s of steps) for (const d of s.dependsOn) if (byId.has(d)) indegree.set(s.id, (indegree.get(s.id) ?? 0) + 1);

    const queue = steps.filter((s) => (indegree.get(s.id) ?? 0) === 0);
    const ordered: PlannedStep[] = [];
    while (queue.length) {
      const s = queue.shift()!;
      ordered.push(s);
      for (const other of steps) {
        if (other.dependsOn.includes(s.id)) {
          indegree.set(other.id, (indegree.get(other.id) ?? 1) - 1);
          if (indegree.get(other.id) === 0) queue.push(other);
        }
      }
    }
    // Fallback: if a cycle slipped in, run remaining in declared order.
    if (ordered.length !== steps.length) return steps;
    return ordered;
  }
}

/** CLI entrypoint: `npm run orchestrate -- "your goal here"` */
async function main() {
  const goal = process.argv.slice(2).join(' ').trim() || 'Summarize the CROO Agent Protocol.';
  const orch = new Orchestrator();
  console.log(`[contractor] goal: ${goal}`);
  const result = await orch.run({ goal });
  console.log(JSON.stringify(result, null, 2));
  const report = buildReport(result.subOrders, result.totalUsdcSpent);
  const { jsonPath } = writeReport(report);
  console.log(`[contractor] report -> ${jsonPath} (orders=${report.totals.orders}, counterparties=${report.totals.uniqueCounterparties})`);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[contractor] fatal:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

function blockedResult(step: PlannedStep, serviceId: string, reason: string): SubOrderResult {
  return {
    stepId: step.id,
    serviceId,
    orderId: '',
    verified: false,
    verificationNotes: [`Skipped: ${reason}`],
  };
}

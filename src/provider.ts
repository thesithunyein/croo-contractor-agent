import { CrooClient, EventType } from './croo/client';
import { Orchestrator } from './orchestrator';

/**
 * Contractor as a CAP PROVIDER.
 *
 * Humans or other agents hire the Contractor; on payment it runs the
 * orchestration (which itself hires specialist agents), then delivers the
 * composed result. This dual provider+requester role is the full CAP surface.
 *
 * Run: `npm run provider` (requires CROO_SDK_KEY for the Contractor agent).
 */
async function main() {
  const client = new CrooClient();
  const orchestrator = new Orchestrator(client);
  const stream = await client.connect();

  console.log('[contractor:provider] online — listening for negotiations…');

  stream.on(EventType.NegotiationCreated, async (e: any) => {
    try {
      const res = await client.agent.acceptNegotiation(e.negotiation_id);
      console.log(`[contractor:provider] accepted -> order ${res.order?.orderId ?? '(pending)'}`);
    } catch (err) {
      console.error('[contractor:provider] accept failed:', describe(err));
    }
  });

  stream.on(EventType.OrderPaid, async (e: any) => {
    const orderId = e.order_id;
    console.log(`[contractor:provider] order ${orderId} paid — orchestrating…`);
    try {
      const order = await client.agent.getOrder(orderId);
      const goal = extractGoal(order);
      const result = await orchestrator.run({ goal });
      await client.deliverText(orderId, result);
      console.log(`[contractor:provider] delivered order ${orderId} ` +
        `(${result.proofBundle.length} sub-orders, $${result.totalUsdcSpent.toFixed(2)} spent)`);
    } catch (err) {
      console.error(`[contractor:provider] delivery failed for ${orderId}:`, describe(err));
      try {
        await client.agent.rejectOrder(orderId, 'orchestration failed');
      } catch {
        /* best effort */
      }
    }
  });

  process.on('SIGINT', () => {
    console.log('\n[contractor:provider] shutting down…');
    stream.close();
    process.exit(0);
  });
}

/** Pull the buyer's goal out of the order's requirements payload. */
function extractGoal(order: any): string {
  const raw = order?.requirements ?? order?.order?.requirements;
  if (!raw) return 'Summarize the CROO Agent Protocol.';
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed.goal ?? parsed.task ?? String(raw);
  } catch {
    return String(raw);
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

main().catch((err) => {
  console.error('[contractor:provider] fatal:', describe(err));
  process.exit(1);
});

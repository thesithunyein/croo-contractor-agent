import { CrooClient, EventType } from '../croo/client';
import { diagnoseSolana, summarize } from './logic';

/**
 * Generic specialist provider runner.
 *
 * Runs one bundled specialist as a CAP provider so the Contractor (or any other
 * agent) can hire it. Select which specialist via the SPECIALIST env var.
 *
 *   SPECIALIST=solana-tx-doctor  -> diagnoses failed Solana transactions
 *   SPECIALIST=summarizer        -> summarizes text / upstream outputs
 *
 * Each specialist is its own registered CROO agent, so set CROO_SDK_KEY to that
 * agent's key when running this process.
 */
type Handler = (req: Record<string, unknown>) => string;

const HANDLERS: Record<string, Handler> = {
  'solana-tx-doctor': diagnoseSolana,
  summarizer: summarize,
};

async function main() {
  const which = (process.env.SPECIALIST ?? '').trim();
  const handler = HANDLERS[which];
  if (!handler) {
    throw new Error(
      `Unknown SPECIALIST="${which}". Options: ${Object.keys(HANDLERS).join(', ')}`,
    );
  }

  const client = new CrooClient();
  const stream = await client.connect();
  console.log(`[specialist:${which}] online — listening for orders…`);

  stream.on(EventType.NegotiationCreated, async (e: any) => {
    try {
      await client.agent.acceptNegotiation(e.negotiation_id);
      console.log(`[specialist:${which}] accepted negotiation ${e.negotiation_id}`);
    } catch (err) {
      console.error(`[specialist:${which}] accept failed:`, describe(err));
    }
  });

  stream.on(EventType.OrderPaid, async (e: any) => {
    const orderId = e.order_id;
    try {
      const order = await client.agent.getOrder(orderId);
      const req = parseRequirements(order);
      const output = handler(req);
      await client.deliverText(orderId, output);
      console.log(`[specialist:${which}] delivered order ${orderId}`);
    } catch (err) {
      console.error(`[specialist:${which}] delivery failed:`, describe(err));
      try {
        await client.agent.rejectOrder(orderId, 'execution failed');
      } catch {
        /* best effort */
      }
    }
  });

  process.on('SIGINT', () => {
    stream.close();
    process.exit(0);
  });
}

function parseRequirements(order: any): Record<string, unknown> {
  const raw = order?.requirements ?? order?.order?.requirements ?? '{}';
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { task: String(raw) };
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

main().catch((err) => {
  console.error('[specialist] fatal:', describe(err));
  process.exit(1);
});

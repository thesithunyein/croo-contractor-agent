import {
  AgentClient,
  EventType,
  DeliverableType,
  APIError,
  isInsufficientBalance,
} from '@croo-network/sdk';
import { loadEnv, CrooEnv } from '../config';

/**
 * Thin, typed wrapper around the CAP `AgentClient`.
 *
 * Centralizes construction, the WebSocket connection, and error handling so the
 * provider / requester / orchestrator modules stay focused on business logic.
 */
export class CrooClient {
  readonly env: CrooEnv;
  readonly agent: AgentClient;

  constructor(env: CrooEnv = loadEnv()) {
    this.env = env;
    this.agent = new AgentClient(
      { baseURL: env.apiURL, wsURL: env.wsURL },
      env.sdkKey,
    );
  }

  /** Open the real-time event stream. Auto-reconnects internally (SDK feature). */
  async connect() {
    return this.agent.connectWebSocket();
  }

  /**
   * Hire a specialist end-to-end and resolve with the raw deliverable text.
   *
   * Flow: negotiateOrder -> (OrderCreated) payOrder -> (OrderCompleted) getDelivery.
   * The CAP escrow + sponsored-gas settlement happens inside payOrder/deliverOrder.
   */
  async hire(opts: {
    serviceId: string;
    requirements: Record<string, unknown>;
    onPaid?: (orderId: string, txHash?: string) => void;
    timeoutMs?: number;
  }): Promise<{ orderId: string; deliverableText?: string; paymentTxHash?: string }> {
    const stream = await this.connect();
    const timeoutMs = opts.timeoutMs ?? 120_000;

    return new Promise(async (resolve, reject) => {
      let orderId: string | undefined;
      let paymentTxHash: string | undefined;

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`hire() timed out after ${timeoutMs}ms for service ${opts.serviceId}`));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        stream.close();
      };

      stream.on(EventType.OrderCreated, async (e: any) => {
        try {
          orderId = e.order_id;
          const pay = await this.agent.payOrder(e.order_id);
          paymentTxHash = pay.txHash;
          opts.onPaid?.(e.order_id, pay.txHash);
        } catch (err) {
          cleanup();
          reject(this.describe(err));
        }
      });

      stream.on(EventType.OrderCompleted, async (e: any) => {
        try {
          const delivery = await this.agent.getDelivery(e.order_id);
          cleanup();
          resolve({
            orderId: e.order_id,
            deliverableText: delivery.deliverableText,
            paymentTxHash,
          });
        } catch (err) {
          cleanup();
          reject(this.describe(err));
        }
      });

      stream.on(EventType.OrderRejected, (e: any) => {
        cleanup();
        reject(new Error(`Order rejected by provider (order ${e.order_id})`));
      });
      stream.on(EventType.OrderExpired, (e: any) => {
        cleanup();
        reject(new Error(`Order expired (order ${e.order_id})`));
      });
      stream.on(EventType.NegotiationRejected, (e: any) => {
        cleanup();
        reject(new Error(`Negotiation rejected (${e.negotiation_id})`));
      });

      try {
        const neg = await this.agent.negotiateOrder({
          serviceId: opts.serviceId,
          requirements: JSON.stringify(opts.requirements),
        });
        // Some providers create the order directly; keep negotiationId for tracing.
        void neg.negotiationId;
      } catch (err) {
        cleanup();
        reject(this.describe(err));
      }
    });
  }

  /** Deliver a result for an order this agent is providing. */
  async deliverText(orderId: string, payload: unknown) {
    const deliverableText =
      typeof payload === 'string' ? payload : JSON.stringify(payload);
    return this.agent.deliverOrder(orderId, {
      deliverableType: DeliverableType.Text,
      deliverableText,
    });
  }

  /** Normalize SDK errors into a readable Error. */
  private describe(err: unknown): Error {
    if (err instanceof APIError) {
      if (isInsufficientBalance(err)) {
        return new Error(
          `Insufficient balance: fund the agent AA wallet with USDC on Base. (${err.message})`,
        );
      }
      return new Error(`CAP APIError [${err.code}] ${err.reason}: ${err.message}`);
    }
    return err instanceof Error ? err : new Error(String(err));
  }
}

export { EventType, DeliverableType };

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
    const timeoutMs = opts.timeoutMs ?? 180_000;

    return new Promise(async (resolve, reject) => {
      let myOrderId: string | undefined;
      let myNegotiationId: string | undefined;
      let paymentTxHash: string | undefined;
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`hire() timed out after ${timeoutMs}ms for service ${opts.serviceId}`));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        stream.close();
      };

      stream.on(EventType.OrderCreated, async (e: any) => {
        // Only pay for orders matching OUR negotiation — avoid stealing events
        // from other orders that may arrive on the same WebSocket.
        if (myNegotiationId && e.negotiation_id !== myNegotiationId) return;
        if (settled) return;
        try {
          myOrderId = e.order_id;
          const pay = await this.agent.payOrder(e.order_id);
          paymentTxHash = pay.txHash;
          opts.onPaid?.(e.order_id, pay.txHash);
        } catch (err) {
          if (settled) return;
          settled = true;
          cleanup();
          reject(this.describe(err));
        }
      });

      stream.on(EventType.OrderCompleted, async (e: any) => {
        // Only resolve for OUR order — ignore completions from other orders.
        if (myOrderId && e.order_id !== myOrderId) return;
        if (settled) return;
        settled = true;
        try {
          const delivery = await this.agent.getDelivery(e.order_id) as any;
          cleanup();
          resolve({
            orderId: e.order_id,
            deliverableText: delivery.deliverableText || delivery.deliverableSchema || delivery.deliverableUrl || JSON.stringify(delivery),
            paymentTxHash,
          });
        } catch (err) {
          cleanup();
          reject(this.describe(err));
        }
      });

      stream.on(EventType.OrderRejected, (e: any) => {
        if (myOrderId && e.order_id !== myOrderId) return;
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`Order rejected by provider (order ${e.order_id})`));
      });
      stream.on(EventType.OrderExpired, (e: any) => {
        if (myOrderId && e.order_id !== myOrderId) return;
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`Order expired (order ${e.order_id})`));
      });
      stream.on(EventType.NegotiationRejected, (e: any) => {
        if (myNegotiationId && e.negotiation_id !== myNegotiationId) return;
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`Negotiation rejected (${e.negotiation_id})`));
      });

      try {
        const neg = await this.agent.negotiateOrder({
          serviceId: opts.serviceId,
          requirements: JSON.stringify(opts.requirements),
        });
        myNegotiationId = neg.negotiationId;
      } catch (err) {
        if (settled) return;
        settled = true;
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

/**
 * Domain types for the CROO Contractor orchestrator.
 *
 * These describe the orchestration layer that sits on top of the raw CAP SDK
 * (negotiation / order / delivery primitives). They are intentionally
 * independent of the SDK so the planner and verifier are unit-testable.
 */

/** A specialist service the Contractor is allowed to hire. */
export interface RegistryEntry {
  /** CAP serviceId registered in the CROO Dashboard. */
  serviceId: string;
  /** Human-readable name. */
  name: string;
  /** Capability tags used by the planner to route sub-tasks. */
  tags: string[];
  /** Advertised price per call in USDC (used for guardrails / planning). */
  priceUsdc: number;
  /** Expected deliverable shape, used to pick a verifier. */
  deliverable: 'text' | 'schema';
  /** Optional JSON schema (required fields) the delivery must satisfy. */
  requiredFields?: string[];
}

/** A single unit of work the orchestrator will subcontract to one specialist. */
export interface PlannedStep {
  id: string;
  /** Tag the step needs; the planner resolves it to a RegistryEntry. */
  capability: string;
  /** Requirements payload passed to the specialist (CAP `requirements`). */
  requirements: Record<string, unknown>;
  /** Step ids this step depends on (outputs fed in as inputs). */
  dependsOn: string[];
}

/** A full plan: an ordered DAG of steps derived from a goal. */
export interface JobPlan {
  goal: string;
  steps: PlannedStep[];
}

/** Result of hiring one specialist via CAP. */
export interface SubOrderResult {
  stepId: string;
  serviceId: string;
  orderId: string;
  paymentTxHash?: string;
  deliverableText?: string;
  parsed?: unknown;
  verified: boolean;
  verificationNotes: string[];
  /** SHA-256 of the raw deliverable, included in the proof bundle. */
  resultHash?: string;
}

/** Final composed output returned to the caller of the Contractor. */
export interface JobResult {
  goal: string;
  composed: unknown;
  subOrders: SubOrderResult[];
  totalUsdcSpent: number;
  /** Tamper-evident proof: order ids + result hashes for every sub-order. */
  proofBundle: Array<{ stepId: string; orderId: string; resultHash?: string }>;
}

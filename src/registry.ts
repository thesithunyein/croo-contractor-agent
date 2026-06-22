import { RegistryEntry } from './types';
import { loadEnv } from './config';

/**
 * Curated registry of specialist services the Contractor may hire.
 *
 * The CAP SDK does not expose programmatic service-search, so discovery is an
 * explicit allow-list of serviceIds. Populate `serviceId` values from:
 *   1. Your own specialist agents (see src/specialists/*), and
 *   2. Partner agents recruited via CROO Discord (reciprocal hiring).
 *
 * Each entry's `tags` drive the planner's capability routing.
 */
export const REGISTRY: RegistryEntry[] = [
  {
    serviceId: process.env.SOLANA_TX_DOCTOR_SERVICE_ID ?? '',
    name: 'Solana TX Doctor',
    tags: ['solana', 'debug', 'onchain', 'diagnosis'],
    priceUsdc: 1.0,
    deliverable: 'schema',
    requiredFields: ['errorCode', 'cause', 'fix'],
  },
  {
    serviceId: process.env.SUMMARIZER_SERVICE_ID ?? '',
    name: 'Summarizer',
    tags: ['summarize', 'text', 'content'],
    priceUsdc: 0.5,
    deliverable: 'text',
  },
];

/** Returns registry entries that are actually configured (have a serviceId). */
export function activeRegistry(): RegistryEntry[] {
  const env = loadEnv();
  const allowList = new Set(env.registryServiceIds);
  return REGISTRY.filter((e) => {
    if (!e.serviceId) return false;
    // If an allow-list is provided, restrict to it; otherwise allow all configured.
    return allowList.size === 0 || allowList.has(e.serviceId);
  });
}

/** Resolve the best registry entry for a capability tag. */
export function resolveCapability(capability: string): RegistryEntry | undefined {
  const candidates = activeRegistry().filter((e) => e.tags.includes(capability));
  if (candidates.length === 0) return undefined;
  // Prefer the cheapest qualifying specialist.
  return candidates.sort((a, b) => a.priceUsdc - b.priceUsdc)[0];
}

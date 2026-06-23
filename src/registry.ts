import * as fs from 'fs';
import * as path from 'path';
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
    source: 'builtin',
  },
  {
    serviceId: process.env.SUMMARIZER_SERVICE_ID ?? '',
    name: 'Summarizer',
    tags: ['summarize', 'text', 'content'],
    priceUsdc: 0.5,
    deliverable: 'text',
    source: 'builtin',
  },
];

/**
 * Load partner agents recruited via Discord from partners.json (repo root).
 *
 * This is the bulk-registry: paste other teams' serviceIds here (no code edits)
 * and the Contractor will hire them. Each partner becomes a unique A2A
 * counterparty — the core lever for the composability score.
 */
export function loadPartners(): RegistryEntry[] {
  const file = path.resolve(process.cwd(), 'partners.json');
  if (!fs.existsSync(file)) return [];
  try {
    // Strip a UTF-8 BOM (common when the file is created on Windows) before parsing.
    const raw = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    const list: any[] = Array.isArray(raw) ? raw : raw.partners ?? [];
    return list
      .filter((p) => p && p.serviceId)
      .map((p) => ({
        serviceId: String(p.serviceId),
        name: String(p.name ?? p.serviceId),
        tags: Array.isArray(p.tags) ? p.tags.map(String) : ['partner'],
        priceUsdc: Number(p.priceUsdc ?? 0.01),
        deliverable: p.deliverable === 'schema' ? 'schema' : 'text',
        requiredFields: Array.isArray(p.requiredFields) ? p.requiredFields.map(String) : undefined,
        source: 'partner' as const,
        team: p.team ? String(p.team) : undefined,
      }));
  } catch (err) {
    console.warn('[registry] failed to parse partners.json:', err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Returns all hireable entries (have a serviceId), de-duplicated by serviceId.
 *
 * - Built-in specialists are filtered by the CONTRACTOR_REGISTRY_SERVICE_IDS
 *   allow-list (when set), for safety.
 * - Partner agents from partners.json are ALWAYS included (they were added
 *   explicitly) so the fan-out can reach every recruited counterparty.
 */
export function activeRegistry(): RegistryEntry[] {
  const env = loadEnv();
  const allowList = new Set(env.registryServiceIds);
  const builtins = REGISTRY.filter((e) => {
    if (!e.serviceId) return false;
    return allowList.size === 0 || allowList.has(e.serviceId);
  });
  const partners = loadPartners();
  const seen = new Set<string>();
  const merged: RegistryEntry[] = [];
  for (const e of [...builtins, ...partners]) {
    if (e.serviceId && !seen.has(e.serviceId)) {
      seen.add(e.serviceId);
      merged.push(e);
    }
  }
  return merged;
}

/** Resolve the best registry entry for a capability tag. */
export function resolveCapability(capability: string): RegistryEntry | undefined {
  const candidates = activeRegistry().filter((e) => e.tags.includes(capability));
  if (candidates.length === 0) return undefined;
  // Prefer the cheapest qualifying specialist.
  return candidates.sort((a, b) => a.priceUsdc - b.priceUsdc)[0];
}

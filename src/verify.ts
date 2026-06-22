import { createHash } from 'crypto';
import { RegistryEntry } from './types';

export interface VerificationOutcome {
  verified: boolean;
  notes: string[];
  parsed?: unknown;
  resultHash: string;
}

/**
 * Verification-first gate: every sub-delivery must pass before the orchestrator
 * accepts and composes it. Mirrors CAP's "no proof, no payment" ethos at the
 * orchestration layer (we still re-check what we paid for).
 */
export function verifyDelivery(
  entry: RegistryEntry,
  deliverableText: string | undefined,
): VerificationOutcome {
  const notes: string[] = [];
  const raw = deliverableText ?? '';
  const resultHash = sha256(raw);

  if (!raw || raw.trim() === '') {
    return { verified: false, notes: ['Empty deliverable'], resultHash };
  }

  if (entry.deliverable === 'text') {
    return { verified: true, notes: ['Non-empty text deliverable'], parsed: raw, resultHash };
  }

  // Schema deliverable: must be valid JSON.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { verified: false, notes: ['Deliverable is not valid JSON'], resultHash };
  }

  // Required-field check.
  if (entry.requiredFields && entry.requiredFields.length > 0) {
    if (typeof parsed !== 'object' || parsed === null) {
      return { verified: false, notes: ['Expected a JSON object'], parsed, resultHash };
    }
    const obj = parsed as Record<string, unknown>;
    const missing = entry.requiredFields.filter((f) => !(f in obj));
    if (missing.length > 0) {
      notes.push(`Missing required fields: ${missing.join(', ')}`);
      return { verified: false, notes, parsed, resultHash };
    }
    notes.push(`All required fields present: ${entry.requiredFields.join(', ')}`);
  }

  return { verified: true, notes: notes.length ? notes : ['Valid JSON schema'], parsed, resultHash };
}

export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

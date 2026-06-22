/**
 * Pure execution logic for the bundled specialist agents.
 *
 * Execution stays in our runtime (CAP only governs commerce/verification), so
 * these are plain functions. Each returns the deliverable string the provider
 * will submit via deliverOrder.
 */

/** Minimal Solana error-code map distilled from the Solana TX Debugger skill. */
const ANCHOR_ERRORS: Record<number, { name: string; cause: string; fix: string }> = {
  3010: {
    name: 'AccountNotSigner',
    cause: 'An account expected to sign the transaction was not passed as a signer.',
    fix: 'Mark the account with `Signer` / add `.signers([...])` (web3.js) or `#[account(signer)]` (Anchor).',
  },
  2006: {
    name: 'ConstraintSeeds',
    cause: 'A PDA seeds constraint failed — derived address does not match the provided account.',
    fix: 'Recompute the PDA with the exact seeds + program id used on-chain.',
  },
  6000: {
    name: 'Custom (user-defined #0)',
    cause: 'User-defined Anchor error. Anchor user errors start at 6000 (0x1770), not 0x1000.',
    fix: 'Open the program IDL/error enum and map code-6000 to the variant index.',
  },
};

/** Diagnose a failed Solana transaction from an error code or log snippet. */
export function diagnoseSolana(input: Record<string, unknown>): string {
  const signature = String(input.signature ?? '');
  const goal = String(input.goal ?? '');
  const text = `${signature} ${goal} ${JSON.stringify(input)}`;

  // Extract a hex/decimal custom program error if present.
  const hexMatch = text.match(/0x([0-9a-fA-F]+)/);
  const code = hexMatch ? parseInt(hexMatch[1], 16) : undefined;

  let entry = code !== undefined ? ANCHOR_ERRORS[code] : undefined;
  if (!entry && /compute|budget|exceeded/i.test(text)) {
    entry = {
      name: 'ComputationalBudgetExceeded',
      cause: 'Instruction exceeded the default 200k compute-unit limit.',
      fix: 'Add ComputeBudgetProgram.setComputeUnitLimit(400_000) and a priority fee.',
    };
  }

  const result = {
    errorCode: code !== undefined ? `0x${code.toString(16)} (${code})` : 'unknown',
    name: entry?.name ?? 'Unrecognized',
    cause: entry?.cause ?? 'Could not classify from the provided input. Provide tx logs or the custom error code.',
    fix: entry?.fix ?? 'Fetch full program logs via getTransaction and re-run the diagnosis with the logs.',
    signature: signature || null,
  };
  return JSON.stringify(result);
}

/** Naive extractive summarizer (placeholder for an LLM call in production). */
export function summarize(input: Record<string, unknown>): string {
  const goal = String(input.goal ?? input.task ?? '');
  const upstream = Object.entries(input)
    .filter(([k]) => k.startsWith('input_'))
    .map(([, v]) => (typeof v === 'string' ? v : JSON.stringify(v)))
    .join(' ');

  const source = `${goal} ${upstream}`.trim();
  const sentences = source.split(/(?<=[.!?])\s+/).filter(Boolean);
  const summary = sentences.slice(0, 3).join(' ') || goal || 'No content to summarize.';
  return `Summary: ${summary}`;
}

import { JobPlan, PlannedStep } from './types';

/**
 * Minimal, deterministic planner: maps a goal + optional explicit steps into a
 * JobPlan (DAG of capability calls). This is intentionally rule-based so the
 * orchestration is verifiable and reproducible for the demo. Swap in an LLM
 * planner later without changing the orchestrator contract.
 */
export function planJob(input: {
  goal: string;
  /** Optional pre-built steps; if omitted, a heuristic plan is derived. */
  steps?: PlannedStep[];
}): JobPlan {
  if (input.steps && input.steps.length > 0) {
    return { goal: input.goal, steps: input.steps };
  }

  const goal = input.goal.toLowerCase();
  const steps: PlannedStep[] = [];

  // Heuristic routing by keyword -> capability tag.
  const signatureMatch = input.goal.match(/[1-9A-HJ-NP-Za-km-z]{43,88}/);
  if (goal.includes('debug') || goal.includes('failed') || goal.includes('tx') || signatureMatch) {
    steps.push({
      id: 'diagnose',
      capability: 'debug',
      requirements: { signature: signatureMatch?.[0] ?? '', goal: input.goal },
      dependsOn: [],
    });
  }

  if (goal.includes('summar') || goal.includes('explain') || goal.includes('report')) {
    steps.push({
      id: 'summarize',
      capability: 'summarize',
      requirements: { goal: input.goal },
      dependsOn: steps.length ? [steps[steps.length - 1].id] : [],
    });
  }

  if (steps.length === 0) {
    // Fallback: a single generic summarize step.
    steps.push({
      id: 'summarize',
      capability: 'summarize',
      requirements: { goal: input.goal },
      dependsOn: [],
    });
  }

  return { goal: input.goal, steps };
}

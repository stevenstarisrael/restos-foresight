import { cacheGet, cacheKeys, cacheSet } from '@/lib/cache';
import type { MemoryMode } from '@/lib/hindsight';
import type { PlanResult } from '@/lib/plan';
import { findFestival, runPlan } from '@/lib/planner';

export const maxDuration = 120;

const MODES: MemoryMode[] = ['none', 'firstSeason', 'full'];

// Saved plans for a festival, so the page opens pre-filled without any LLM call.
export async function GET(request: Request) {
  const festival = new URL(request.url).searchParams.get('festival') ?? 'diwali';
  const plans: Partial<Record<MemoryMode, PlanResult>> = {};
  for (const mode of MODES) {
    const hit = await cacheGet<PlanResult>(cacheKeys.plan(mode, festival));
    if (hit) plans[mode] = { ...hit.value, cachedAt: hit.savedAt };
  }
  return Response.json(plans);
}

// Returns the saved plan unless `force` is set (Re-run / Hard refresh).
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const mode = body.mode as MemoryMode;
  const festival = typeof body.festival === 'string' ? body.festival : 'diwali';
  if (!MODES.includes(mode)) return Response.json({ error: `mode must be one of ${MODES.join(', ')}` }, { status: 400 });
  try {
    findFestival(festival);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }

  const key = cacheKeys.plan(mode, festival);
  if (!body.force) {
    const hit = await cacheGet<PlanResult>(key);
    if (hit) return Response.json({ ...hit.value, cachedAt: hit.savedAt });
  }
  try {
    const result = await runPlan(mode, festival);
    await cacheSet(key, result);
    return Response.json(result);
  } catch (err) {
    console.error('[plan]', err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}

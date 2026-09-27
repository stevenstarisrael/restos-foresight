import { runPlan } from '@/lib/planner';
import type { MemoryMode } from '@/lib/hindsight';

export const maxDuration = 120;

const MODES: MemoryMode[] = ['none', 'firstSeason', 'full'];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const mode = body.mode as MemoryMode;
  if (!MODES.includes(mode)) return Response.json({ error: `mode must be one of ${MODES.join(', ')}` }, { status: 400 });
  try {
    return Response.json(await runPlan(mode, body.festival ?? 'diwali'));
  } catch (err) {
    console.error('[plan]', err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}

import { cacheDelete, cacheGet, cacheKeys, cacheSet } from '@/lib/cache';
import { BANKS, hindsight, PLAYBOOK } from '@/lib/hindsight';

const MODEL_ID = PLAYBOOK.id;

type Playbook = { name: string; content: string; refreshedAt: string | null };

export async function GET(request: Request) {
  if (!new URL(request.url).searchParams.has('force')) {
    const hit = await cacheGet<Playbook>(cacheKeys.playbook);
    if (hit) return Response.json(hit.value);
  }
  try {
    const model = await hindsight().getMentalModel(BANKS.full, MODEL_ID, { detail: 'content' });
    const playbook: Playbook = { name: model.name, content: model.content ?? '', refreshedAt: model.last_refreshed_at ?? null };
    // Don't save an empty playbook that is still being generated.
    if (playbook.content) await cacheSet(cacheKeys.playbook, playbook);
    return Response.json(playbook);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}

// Re-synthesise the playbook from current memory (e.g. after teaching it
// something new). Runs asynchronously on the Hindsight side.
export async function POST() {
  try {
    await hindsight().refreshMentalModel(BANKS.full, MODEL_ID);
    await cacheDelete(cacheKeys.playbook);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}

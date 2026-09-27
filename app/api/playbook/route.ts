import { BANKS, hindsight, PLAYBOOK } from '@/lib/hindsight';

const MODEL_ID = PLAYBOOK.id;

export async function GET() {
  try {
    const model = await hindsight().getMentalModel(BANKS.full, MODEL_ID, { detail: 'content' });
    return Response.json({ name: model.name, content: model.content ?? '', refreshedAt: model.last_refreshed_at ?? null });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}

// Re-synthesise the playbook from current memory (e.g. after teaching it
// something new). Runs asynchronously on the Hindsight side.
export async function POST() {
  try {
    await hindsight().refreshMentalModel(BANKS.full, MODEL_ID);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}

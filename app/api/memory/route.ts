import { BANKS, hindsight } from '@/lib/hindsight';
import { TODAY } from '@/data/outlet';

// What the agent has learned: consolidated observations (with how many raw
// memories back each one) plus counts per memory type.
export async function GET(request: Request) {
  const bankKey = new URL(request.url).searchParams.get('bank') === 'firstSeason' ? 'firstSeason' : 'full';
  const bank = BANKS[bankKey];
  try {
    const client = hindsight();
    const [observations, world, experience] = await Promise.all([
      client.listMemories(bank, { type: 'observation', limit: 60 }),
      client.listMemories(bank, { type: 'world', limit: 1 }),
      client.listMemories(bank, { type: 'experience', limit: 1 }),
    ]);
    const beliefs = observations.items
      .map((o) => ({ id: o.id, text: o.text ?? '', proofCount: o.proof_count ?? 1, tags: o.tags ?? [] }))
      .sort((a, b) => b.proofCount - a.proofCount);
    return Response.json({
      bank,
      counts: { observation: observations.total, world: world.total, experience: experience.total },
      beliefs,
    });
  } catch (err) {
    console.error('[memory:get]', err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}

// "Teach it": a staff note or customer request logged from the floor goes
// straight into the outlet's memory.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (text.length < 10) return Response.json({ error: 'Write at least a short sentence.' }, { status: 400 });
  if (text.length > 2000) return Response.json({ error: 'Keep notes under 2000 characters.' }, { status: 400 });
  const kind = ['staff_note', 'lost_demand', 'stockout', 'waste', 'supplier'].includes(body.kind) ? body.kind : 'staff_note';
  const tags = [`kind:${kind}`];
  if (typeof body.festival === 'string' && body.festival) tags.push(`festival:${body.festival}`);
  try {
    const result = await hindsight().retain(BANKS.full, text, {
      timestamp: `${TODAY}T${new Date().toTimeString().slice(0, 8)}+05:30`,
      context: kind === 'lost_demand' ? 'Customer demand we could not serve (not visible in sales data)' : `restOS ${kind.replace('_', ' ')} log for Spice Garden · Banjara Hills`,
      tags,
      metadata: { kind, source: 'live-demo' },
    });
    return Response.json({ ok: result.success, bank: BANKS.full });
  } catch (err) {
    console.error('[memory:post]', err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}

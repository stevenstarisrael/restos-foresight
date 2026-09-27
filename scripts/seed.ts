// Seeds two Hindsight banks from data/history.ts:
//   season1 - only what happened before 2025 (one festival season of memory)
//   full    - the full two years
// Usage: npm run seed            (only retains events the bank doesn't have yet)
//        npm run seed -- --reset (delete both banks first)
import 'dotenv/config';
import { FIRST_SEASON_CUTOFF, history, type HistoryEvent } from '../data/history';
import {
  BANK_MISSION,
  BANKS,
  DIRECTIVES,
  eventContext,
  eventTags,
  hindsight,
  PLAYBOOK,
  RETAIN_MISSION,
  toIST,
} from '../lib/hindsight';

const client = hindsight();
const reset = process.argv.includes('--reset');

async function setupBank(bankId: string) {
  if (reset) {
    await client.deleteBank(bankId).catch(() => undefined);
    console.log(`  deleted ${bankId}`);
  }
  await client.createBank(bankId, {
    reflectMission: BANK_MISSION,
    retainMission: RETAIN_MISSION,
    enableObservations: true,
  });
  const existing = await client.listDirectives(bankId);
  const names = new Set((existing.items ?? []).map((d) => d.name));
  for (const d of DIRECTIVES) {
    if (!names.has(d.name)) await client.createDirective(bankId, d.name, d.content);
  }
}

async function retainAll(bankId: string, events: HistoryEvent[]) {
  const batchSize = 8;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    await client.retainBatch(
      bankId,
      batch.map((e) => ({
        content: e.text,
        timestamp: toIST(e.at),
        context: eventContext(e),
        document_id: e.id,
        tags: eventTags(e),
        metadata: { kind: e.kind, festival: e.festival ?? '' },
      })),
      { async: true },
    );
    console.log(`  queued ${Math.min(i + batchSize, events.length)}/${events.length}`);
  }
}

async function waitForProcessing(bankId: string, expectedDocs: number) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const docs = await client.listDocuments(bankId, { limit: 1 });
    const pending = await client.listMemories(bankId, { consolidationState: 'pending', limit: 1 });
    if (docs.total >= expectedDocs && pending.total === 0) return;
    process.stdout.write(`  processing… ${docs.total}/${expectedDocs} docs, ${pending.total} pending consolidation\r`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log('\n  still processing in the background - that is fine, the app will pick it up');
}

async function main() {
  const firstSeason = history.filter((e) => e.at < FIRST_SEASON_CUTOFF);
  const plan: [string, HistoryEvent[]][] = [
    [BANKS.firstSeason, firstSeason],
    [BANKS.full, history],
  ];

  for (const [bankId, events] of plan) {
    await setupBank(bankId);
    // Only retain what the bank doesn't have yet, so adding history is cheap.
    const existing = new Set((await client.listDocuments(bankId, { limit: 500 })).items.map((d) => d.id));
    const fresh = events.filter((e) => !existing.has(e.id));
    console.log(`\n${bankId}: ${events.length} events, ${fresh.length} new`);
    if (fresh.length) {
      await retainAll(bankId, fresh);
      await waitForProcessing(bankId, events.length);
    }
    console.log(`\n  ready`);
  }

  // A mental model is a living summary Hindsight keeps up to date. It is the
  // "Diwali playbook" the demo shows evolving.
  const models = await client.listMentalModels(BANKS.full);
  if ((models.items ?? []).some((m) => m.id === PLAYBOOK.id)) {
    await client.updateMentalModel(BANKS.full, PLAYBOOK.id, { name: PLAYBOOK.name, sourceQuery: PLAYBOOK.sourceQuery });
    await client.refreshMentalModel(BANKS.full, PLAYBOOK.id);
    console.log(`\nrefreshing mental model: ${PLAYBOOK.id}`);
  } else {
    await client.createMentalModel(BANKS.full, PLAYBOOK.name, PLAYBOOK.sourceQuery, { id: PLAYBOOK.id });
    console.log(`\ncreated mental model: ${PLAYBOOK.id}`);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

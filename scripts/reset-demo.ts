// Removes everything taught live from the UI ("Teach Foresight"), keeping the
// seeded history, so the demo can be run again from the same starting point.
// Usage: npm run demo:reset
import 'dotenv/config';
import { history } from '../data/history';
import { BANKS, hindsight, PLAYBOOK } from '../lib/hindsight';

async function main() {
  const client = hindsight();
  const seeded = new Set(history.map((e) => e.id));
  const docs = await client.listDocuments(BANKS.full, { limit: 500 });
  const live = docs.items.filter((d) => !seeded.has(d.id));
  for (const doc of live) {
    await client.deleteDocument(BANKS.full, doc.id);
    console.log(`deleted ${doc.id} (${doc.created_at ?? ''})`);
  }
  await client.refreshMentalModel(BANKS.full, PLAYBOOK.id);
  console.log(`${live.length} live note(s) removed; playbook refreshing.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import type { Metadata } from 'next';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { TODAY, upcomingFestivals } from '@/data/outlet';
import { Story, type StoryData } from '@/components/story';
import { summarize } from '@/lib/insights';
import type { PlanResult } from '@/lib/plan';
import { buildRows, score } from '@/lib/readiness';

export const metadata: Metadata = {
  title: 'restOS Foresight',
  description: 'Last Diwali the sugar ran out at 7:05pm. Foresight remembers every festival so your kitchen doesn’t repeat it.',
};

type Mode = PlanResult['mode'];
const MODES: Mode[] = ['none', 'firstSeason', 'full'];

// Every number on the story page comes from the saved demo plans and restOS
// data, so the story matches what "Watch it live" shows.
async function loadStoryData(): Promise<StoryData> {
  let cache: Record<string, { value: PlanResult }> = {};
  try {
    cache = JSON.parse(await readFile(path.join(process.cwd(), 'data', 'demo-cache.json'), 'utf8'));
  } catch {
    // No snapshot yet: the learning-curve section falls back to "watch it live".
  }
  const plans = Object.fromEntries(
    MODES.flatMap((m) => (cache[`plan:${m}:diwali`] ? [[m, cache[`plan:${m}:diwali`].value.plan]] : [])),
  ) as Partial<Record<Mode, PlanResult['plan']>>;
  const rows = buildRows('diwali', plans);

  const curve = MODES.flatMap((mode) => {
    const plan = plans[mode];
    const s = score(rows, mode);
    if (!plan || !s) return [];
    return [{ mode, readiness: s.readiness, short: s.short, spend: summarize(plan).totalCost }];
  });

  const sugar = plans.full?.orders.find((o) => o.stockId === 'sugar');
  const diwali = upcomingFestivals.find((f) => f.id === 'diwali')!;

  return {
    daysToDiwali: Math.round((Date.parse(diwali.date) - Date.parse(TODAY)) / 86_400_000),
    curve,
    sampleOrder: sugar
      ? { item: sugar.item, quantity: sugar.quantity, unit: sugar.unit, orderBy: sugar.orderBy, lastTime: sugar.lastTime, why: sugar.why }
      : null,
  };
}

export default async function Home() {
  return <Story data={await loadStoryData()} />;
}

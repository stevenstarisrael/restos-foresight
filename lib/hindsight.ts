import { HindsightClient } from '@vectorize-io/hindsight-client';
import type { HistoryEvent } from '@/data/history';

export function hindsight() {
  const baseUrl = process.env.HINDSIGHT_BASE_URL;
  if (!baseUrl) throw new Error('HINDSIGHT_BASE_URL is not set (see .env.example)');
  return new HindsightClient({ baseUrl, apiKey: process.env.HINDSIGHT_API_KEY, maxAttempts: 3 });
}

const prefix = process.env.HINDSIGHT_BANK_PREFIX ?? 'foresight';

// Two snapshots of the same outlet's memory, so the demo can show the
// learning curve side by side: after one festival season, and today.
export const BANKS = {
  firstSeason: `${prefix}-spice-garden-season1`,
  full: `${prefix}-spice-garden`,
} as const;

export type MemoryMode = 'none' | 'firstSeason' | 'full';

export const BANK_MISSION =
  'You are Foresight, the demand and inventory planner for Spice Garden, a Hyderabad restaurant running on restOS. ' +
  'You remember every festival: what sold, what ran out, what was wasted, which suppliers let us down, and what customers asked for that we could not serve. ' +
  'Your job is to turn that history into concrete prep plans - quantities, order-by dates, suppliers and menu changes - for the next festival.';

export const RETAIN_MISSION =
  'Extract quantities (kg, portions, boxes), dates, festival names, ingredient names, supplier names, stock-out times, waste amounts, prices and customer requests. ' +
  'Keep the festival and year attached to every fact.';

export const DIRECTIVES = [
  { name: 'cite-evidence', content: 'Every recommendation must cite the specific past event (festival and year) that justifies it.' },
  { name: 'admit-gaps', content: 'If there is no memory of a festival or ingredient, say so plainly instead of inventing history.' },
  { name: 'safety-stock', content: 'Never recommend letting any ingredient fall below two days of normal usage during a festival.' },
];

export function eventTags(e: HistoryEvent): string[] {
  const tags = [`kind:${e.kind}`];
  if (e.festival) tags.push(`festival:${e.festival}`);
  for (const item of e.items ?? []) tags.push(`item:${item}`);
  if (e.supplier) tags.push(`supplier:${e.supplier}`);
  return tags;
}

export function eventContext(e: HistoryEvent): string {
  switch (e.kind) {
    case 'plan':
      return 'A prep plan I (Foresight) recommended before a festival';
    case 'outcome':
      return 'What actually happened after a festival, compared with my plan';
    case 'lost_demand':
      return 'Customer demand we could not serve (not visible in sales data)';
    default:
      return `restOS ${e.kind.replace('_', ' ')} log for Spice Garden · Banjara Hills`;
  }
}

// History timestamps are local Hyderabad time.
export function toIST(at: string): string {
  return at.length === 16 ? `${at}:00+05:30` : at;
}

// A mental model Hindsight keeps rewritten from memory. Reflect consults it
// first, so it has to carry concrete numbers, not just lessons.
export const PLAYBOOK = {
  id: 'diwali-playbook',
  name: 'Diwali playbook',
  sourceQuery:
    'Diwali playbook for Spice Garden. For each Diwali on record, list per ingredient and packaging item: quantity planned or stocked, quantity actually used, and whether it ran out or was wasted. ' +
    'Then cover staffing on peak evenings (rostered vs needed, waits, walk-outs), online store capacity and outages, order timing, supplier reliability and prices, corporate orders, menu additions, revenue trend year on year, and mistakes to avoid. Keep every number and year.',
};

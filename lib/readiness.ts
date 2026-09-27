import { lastFestivalActuals, stock, upcomingFestivals } from '@/data/outlet';
import type { Plan, PlanResult } from './plan';

// Scores plans against what the outlet actually needed, from restOS records.
// Shared by the live comparison charts and the story page.

type Mode = PlanResult['mode'];
const MODE_ORDER: Mode[] = ['none', 'firstSeason', 'full'];

/** This festival's likely need for an item: last year's actual use + last year's growth. */
export function likelyNeed(festival: string, stockId: string): { need: number; actual: number; label: string } | null {
  const ref = lastFestivalActuals[festival];
  const actual = ref?.items[stockId];
  if (!ref || actual === undefined) return null;
  return { need: Math.round(actual * (1 + ref.growth)), actual, label: ref.label };
}

// need = last year's actual use scaled by last year's growth trend.
// late = quantity a plan ordered after the pre-booking deadline, which won't arrive.
export type Row = {
  stockId: string;
  name: string;
  unit: string;
  actual: number;
  need: number;
  preBookDays?: number;
  available: Partial<Record<Mode, number>>;
  late: Partial<Record<Mode, number>>;
};

const DAY = 86_400_000;

// "Available" = what is on the shelf after the plan's orders arrive, which is
// the number that decides whether we run out. Orders placed after the
// item's pre-booking deadline don't count: they won't arrive in time.
function availableFor(plan: Plan, stockId: string, festivalDate: string | undefined, preBookDays: number | undefined) {
  const onHand = stock.find((s) => s.id === stockId)?.onHand ?? 0;
  let arriving = 0;
  let late = 0;
  for (const o of plan.orders.filter((x) => x.stockId === stockId)) {
    const lead = festivalDate ? (Date.parse(festivalDate) - Date.parse(o.orderBy)) / DAY : Infinity;
    if (preBookDays !== undefined && !(lead >= preBookDays)) late += o.quantity;
    else arriving += o.quantity;
  }
  return { available: onHand + arriving, late };
}

export function buildRows(festival: string, plans: Partial<Record<Mode, Plan>>): Row[] {
  const ref = lastFestivalActuals[festival];
  if (!ref) return [];
  const festivalDate = upcomingFestivals.find((f) => f.id === festival)?.date;
  return Object.entries(ref.items).map(([stockId, actual]) => {
    const item = stock.find((s) => s.id === stockId)!;
    const preBookDays = ref.preBookDays?.[stockId];
    const available: Row['available'] = {};
    const late: Row['late'] = {};
    for (const mode of MODE_ORDER) {
      const plan = plans[mode];
      if (!plan) continue;
      const r = availableFor(plan, stockId, festivalDate, preBookDays);
      available[mode] = r.available;
      if (r.late) late[mode] = r.late;
    }
    return { stockId, name: item.name, unit: item.unit, actual, need: likelyNeed(festival, stockId)!.need, preBookDays, available, late };
  });
}

/** tooLate = items that are short only because the order misses the pre-booking deadline. */
export type Score = { readiness: number; short: string[]; tooLate: string[]; wasteRisk: number };

// Readiness: share of this year's likely need each plan covers (each item
// capped at 100%). Waste risk: money tied up in stock beyond 125% of that
// need, which is what tends to expire or sit unsold.
export function score(rows: Row[], mode: Mode): Score | null {
  const scored = rows.filter((r) => r.available[mode] !== undefined);
  if (!scored.length) return null;
  let total = 0;
  let wasteRisk = 0;
  const short: string[] = [];
  const tooLate: string[] = [];
  for (const r of scored) {
    const available = r.available[mode]!;
    total += Math.min(1, available / r.need);
    if (available < r.need) {
      short.push(r.name);
      if (available + (r.late[mode] ?? 0) >= r.need) tooLate.push(r.name);
    }
    const cost = stock.find((s) => s.id === r.stockId)!.costPerUnit;
    wasteRisk += Math.max(0, available - r.need * 1.25) * cost;
  }
  return { readiness: Math.round((total / scored.length) * 100), short, tooLate, wasteRisk: Math.round(wasteRisk) };
}

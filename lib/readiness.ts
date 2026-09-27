import { lastFestivalActuals, stock } from '@/data/outlet';
import type { Plan, PlanResult } from './plan';

// Scores plans against what the outlet actually needed, from restOS records.
// Shared by the live comparison charts and the story page.

type Mode = PlanResult['mode'];
const MODE_ORDER: Mode[] = ['none', 'firstSeason', 'full'];

// need = last year's actual use scaled by last year's growth trend.
export type Row = { stockId: string; name: string; unit: string; actual: number; need: number; available: Partial<Record<Mode, number>> };

// "Available" = what is on the shelf after the plan's orders arrive, which is
// the number that decides whether we run out.
function availableFor(plan: Plan, stockId: string): number {
  const onHand = stock.find((s) => s.id === stockId)?.onHand ?? 0;
  return onHand + plan.orders.filter((o) => o.stockId === stockId).reduce((sum, o) => sum + o.quantity, 0);
}

export function buildRows(festival: string, plans: Partial<Record<Mode, Plan>>): Row[] {
  const ref = lastFestivalActuals[festival];
  if (!ref) return [];
  return Object.entries(ref.items).map(([stockId, actual]) => {
    const item = stock.find((s) => s.id === stockId)!;
    const available: Row['available'] = {};
    for (const mode of MODE_ORDER) {
      const plan = plans[mode];
      if (plan) available[mode] = availableFor(plan, stockId);
    }
    return { stockId, name: item.name, unit: item.unit, actual, need: Math.round(actual * (1 + ref.growth)), available };
  });
}

export type Score = { readiness: number; short: string[]; wasteRisk: number };

// Readiness: share of this year's likely need each plan covers (each item
// capped at 100%). Waste risk: money tied up in stock beyond 125% of that
// need, which is what tends to expire or sit unsold.
export function score(rows: Row[], mode: Mode): Score | null {
  const scored = rows.filter((r) => r.available[mode] !== undefined);
  if (!scored.length) return null;
  let total = 0;
  let wasteRisk = 0;
  const short: string[] = [];
  for (const r of scored) {
    const available = r.available[mode]!;
    total += Math.min(1, available / r.need);
    if (available < r.need) short.push(r.name);
    const cost = stock.find((s) => s.id === r.stockId)!.costPerUnit;
    wasteRisk += Math.max(0, available - r.need * 1.25) * cost;
  }
  return { readiness: Math.round((total / scored.length) * 100), short, wasteRisk: Math.round(wasteRisk) };
}

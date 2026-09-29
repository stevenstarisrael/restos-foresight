import { stock, suppliers, TODAY } from '@/data/outlet';
import type { Plan, PlanOrder } from './plan';
import { likelyNeed } from './readiness';

// Numbers the cards show are computed here from restOS data (stock on hand,
// unit costs, supplier names, today's date) rather than trusted from the model.

export type Urgency = 'now' | 'soon' | 'later' | 'late';

export type OrderInsight = PlanOrder & {
  onHand: number | null;
  afterOrder: number | null;
  cost: number | null;
  supplierName: string;
  daysLeft: number | null;
  urgency: Urgency;
  shortfall: boolean;
  /** The yardstick shown on the card: restOS likely need when we have records, else the plan's own estimate. */
  need: number;
  needSource: 'records' | 'plan';
  /** What restOS records say about this item last festival (independent of what the AI remembered). */
  record: string | null;
};

const DAY = 86_400_000;

export function daysFromToday(date: string): number | null {
  const t = Date.parse(date);
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.parse(TODAY)) / DAY);
}

function urgencyFor(days: number | null): Urgency {
  if (days === null) return 'later';
  if (days < 0) return 'late';
  if (days <= 3) return 'now';
  if (days <= 10) return 'soon';
  return 'later';
}

export function orderInsight(o: PlanOrder, festival?: string): OrderInsight {
  const item = stock.find((s) => s.id === o.stockId);
  const ref = festival ? likelyNeed(festival, o.stockId) : null;
  const need = ref ? ref.need : o.expectedUse;
  const onHand = item ? item.onHand : null;
  const afterOrder = onHand !== null ? onHand + o.quantity : null;
  const daysLeft = daysFromToday(o.orderBy);
  return {
    ...o,
    onHand,
    afterOrder,
    // Units come from the stock list we give the model, so price per unit applies.
    cost: item ? Math.round(item.costPerUnit * o.quantity) : null,
    supplierName: suppliers.find((s) => s.id === o.supplierId)?.name ?? o.supplierId,
    daysLeft,
    urgency: urgencyFor(daysLeft),
    shortfall: afterOrder !== null && need > 0 && afterOrder < need,
    need,
    needSource: ref ? 'records' : 'plan',
    record: ref && item ? `Used ${ref.actual} ${item.unit} at ${ref.label}` : null,
  };
}

export type PlanSummary = {
  orders: OrderInsight[];
  totalCost: number;
  itemCount: number;
  firstOrderDays: number | null;
  urgentCount: number;
};

export function summarize(plan: Plan, festival?: string): PlanSummary {
  const orders = plan.orders.map((o) => orderInsight(o, festival)).sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
  const days = orders.map((o) => o.daysLeft).filter((d): d is number => d !== null);
  return {
    orders,
    totalCost: orders.reduce((sum, o) => sum + (o.cost ?? 0), 0),
    itemCount: orders.length,
    firstOrderDays: days.length ? Math.min(...days) : null,
    urgentCount: orders.filter((o) => o.urgency === 'now' || o.urgency === 'late').length,
  };
}

// The model is asked for ids so orders link to restOS data; it sometimes
// carries them into prose too ("balaji-traders"). Show names instead.
const NAMES: [RegExp, string][] = [
  ...suppliers.map((s): [RegExp, string] => [new RegExp(`\\b${s.id}\\b`, 'gi'), s.name.replace(/\s*\(.*\)$/, '')]),
  ...stock.filter((s) => s.id.includes('-')).map((s): [RegExp, string] => [new RegExp(`\\b${s.id}\\b`, 'gi'), s.name.toLowerCase()]),
];

const ISO_DATE = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;

export function tidy(text: string): string {
  const named = NAMES.reduce((t, [re, name]) => t.replace(re, name), text);
  // "by 2026-10-25" reads better as "by 25 Oct".
  return named.replace(ISO_DATE, (m) => {
    const d = new Date(`${m}T00:00:00`);
    return Number.isNaN(d.getTime()) ? m : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  });
}

export function rupees(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(n >= 1_000_000 ? 0 : 1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${n}`;
}

export const ITEM_ICON: Record<string, string> = {
  sugar: '🍬',
  ghee: '🧈',
  khoya: '🥛',
  cashew: '🥜',
  paneer: '🧀',
  milk: '🥛',
  mutton: '🍖',
  chicken: '🍗',
  basmati: '🌾',
  staff: '👥',
  'sweet-boxes': '🎁',
  other: '📦',
};

import { stock, suppliers, TODAY } from '@/data/outlet';
import type { Plan, PlanOrder } from './plan';

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

export function orderInsight(o: PlanOrder): OrderInsight {
  const item = stock.find((s) => s.id === o.stockId);
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
    shortfall: afterOrder !== null && o.expectedUse > 0 && afterOrder < o.expectedUse,
  };
}

export type PlanSummary = {
  orders: OrderInsight[];
  totalCost: number;
  itemCount: number;
  firstOrderDays: number | null;
  urgentCount: number;
};

export function summarize(plan: Plan): PlanSummary {
  const orders = plan.orders.map(orderInsight).sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
  const days = orders.map((o) => o.daysLeft).filter((d): d is number => d !== null);
  return {
    orders,
    totalCost: orders.reduce((sum, o) => sum + (o.cost ?? 0), 0),
    itemCount: orders.length,
    firstOrderDays: days.length ? Math.min(...days) : null,
    urgentCount: orders.filter((o) => o.urgency === 'now' || o.urgency === 'late').length,
  };
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
  'sweet-boxes': '🎁',
  other: '📦',
};

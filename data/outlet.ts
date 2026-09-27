// Synthetic restOS outlet snapshot. In production this comes from the restOS
// inventory, purchase-order and supplier modules; here it is fixed so the demo
// is reproducible.

export const TODAY = '2026-09-27';

export const outlet = {
  id: 'spice-garden-banjara',
  brand: 'Spice Garden',
  name: 'Spice Garden · Banjara Hills',
  city: 'Hyderabad',
  covers: 80,
  cuisine: 'Hyderabadi & North Indian, in-house sweets counter',
  // From restOS Payroll & Attendance and the online store.
  team: { rostered: 18, cooks: 9, deliveryRiders: 4 },
  onlineOrdersPerHourNormalPeak: 30,
};

export type Supplier = {
  id: string;
  name: string;
  supplies: string;
  leadTimeDays: number;
  note: string;
};

export const suppliers: Supplier[] = [
  { id: 'balaji-traders', name: 'Balaji Traders (Begum Bazar)', supplies: 'sugar, cashew, rice, broken wheat, besan, oil', leadTimeDays: 2, note: 'Primary dry-goods wholesaler, cheapest list price' },
  { id: 'deccan-wholesale', name: 'Deccan Wholesale Mart', supplies: 'sugar, cashew, rice, oil, dry fruits', leadTimeDays: 1, note: 'Backup dry-goods supplier, ~4% above Balaji list price' },
  { id: 'sri-lakshmi-dairy', name: 'Sri Lakshmi Dairy', supplies: 'milk, ghee, khoya, paneer', leadTimeDays: 1, note: 'Daily milk run; ghee and khoya need 2 days notice for bulk' },
  { id: 'hyderabad-meat-house', name: 'Hyderabad Meat House', supplies: 'mutton, chicken', leadTimeDays: 1, note: 'Daily delivery' },
  { id: 'rythu-fresh', name: 'Rythu Fresh Produce', supplies: 'onion, tomato, greens', leadTimeDays: 1, note: 'Daily delivery' },
  { id: 'packright', name: 'PackRight Packaging', supplies: 'sweet boxes, takeaway containers', leadTimeDays: 4, note: 'Printed sweet boxes need 4 days' },
];

export type StockItem = {
  id: string;
  name: string;
  unit: string;
  onHand: number;
  normalDailyUse: number;
  costPerUnit: number;
  supplierId: string;
};

export const stock: StockItem[] = [
  { id: 'sugar', name: 'Sugar', unit: 'kg', onHand: 18, normalDailyUse: 2, costPerUnit: 44, supplierId: 'balaji-traders' },
  { id: 'ghee', name: 'Ghee', unit: 'kg', onHand: 9, normalDailyUse: 1.2, costPerUnit: 620, supplierId: 'sri-lakshmi-dairy' },
  { id: 'khoya', name: 'Khoya (mawa)', unit: 'kg', onHand: 3, normalDailyUse: 0.6, costPerUnit: 380, supplierId: 'sri-lakshmi-dairy' },
  { id: 'cashew', name: 'Cashew', unit: 'kg', onHand: 4, normalDailyUse: 0.5, costPerUnit: 1040, supplierId: 'deccan-wholesale' },
  { id: 'paneer', name: 'Paneer', unit: 'kg', onHand: 12, normalDailyUse: 4, costPerUnit: 340, supplierId: 'sri-lakshmi-dairy' },
  { id: 'milk', name: 'Milk', unit: 'L', onHand: 40, normalDailyUse: 25, costPerUnit: 58, supplierId: 'sri-lakshmi-dairy' },
  { id: 'mutton', name: 'Mutton', unit: 'kg', onHand: 14, normalDailyUse: 7, costPerUnit: 800, supplierId: 'hyderabad-meat-house' },
  { id: 'chicken', name: 'Chicken', unit: 'kg', onHand: 22, normalDailyUse: 12, costPerUnit: 240, supplierId: 'hyderabad-meat-house' },
  { id: 'basmati', name: 'Basmati rice', unit: 'kg', onHand: 60, normalDailyUse: 14, costPerUnit: 115, supplierId: 'balaji-traders' },
  { id: 'sweet-boxes', name: 'Sweet boxes (500g)', unit: 'pcs', onHand: 40, normalDailyUse: 3, costPerUnit: 18, supplierId: 'packright' },
];

export type Festival = { id: string; name: string; date: string; note: string; lesson: string };

// `lesson` is the one-line problem statement shown at the top of the dashboard,
// taken from the outlet's history (data/history.ts).
export const upcomingFestivals: Festival[] = [
  {
    id: 'dussehra',
    name: 'Dussehra 2026',
    date: '2026-10-20',
    note: 'Dasara feast weekend',
    lesson: 'On Dussehra 2024 the mutton ran out at 8:15 pm and 22 biryani orders were turned away.',
  },
  {
    id: 'diwali',
    name: 'Diwali 2026',
    date: '2026-11-08',
    note: 'Main day Sunday 8 Nov; rush runs ~4 days around it',
    lesson: 'Last Diwali the sugar ran out at 7:05 pm and 55 desserts were turned away.',
  },
];

// What the outlet actually used at the same festival last year, from restOS
// inventory records. The comparison charts use it as the yardstick; the
// planner never sees it directly (only the memory banks hold history).
// growth = last year's festival revenue growth (Diwali ₹6.4L → ₹8.9L), used to
// project this year's need from last year's use. 0 where we have no trend.
// staffNeeded = people on the floor the peak evening actually needed (Diwali 2025
// outcome: 22 was still short, 25 would have been right).
// preBookDays = minimum days before the festival an order must be placed to
// actually arrive (Dussehra 2024: every butcher sold out on Dasara, so mutton
// has to be pre-booked 3 days ahead).
export const lastFestivalActuals: Record<
  string,
  {
    label: string;
    growth: number;
    items: Record<string, number>;
    staffNeeded?: number;
    preBookDays?: Record<string, number>;
    preBookReason?: string;
  }
> = {
  diwali: { label: 'Diwali 2025', growth: 0.39, items: { sugar: 41, ghee: 15, cashew: 8, 'sweet-boxes': 186 }, staffNeeded: 25 },
  dussehra: {
    label: 'Dussehra 2025',
    growth: 0,
    items: { mutton: 27 },
    preBookDays: { mutton: 3 },
    preBookReason: 'on Dussehra 2024 every butcher in the city was sold out',
  },
};

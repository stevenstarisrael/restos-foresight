import { z } from 'zod';
import { stock, suppliers } from '@/data/outlet';

const stockIds: [string, ...string[]] = ['other', ...stock.map((s) => s.id)];
const supplierIds: [string, ...string[]] = ['other', ...suppliers.map((s) => s.id)];

// One shape for every plan, with or without memory, so the UI can compare
// them card by card. Written for a restaurant owner, not an analyst.
export const PlanSchema = z.object({
  headline: z.string().describe('One plain sentence a restaurant owner understands: the single most important thing to do.'),
  expectations: z
    .array(
      z.object({
        title: z.string().describe('What we expect, 2-4 words, e.g. "Sweet demand"'),
        value: z.string().describe('Short big-number style value, e.g. "4x normal", "₹9L revenue", "8 Nov evening"'),
        detail: z.string().describe('One short plain sentence explaining it'),
      }),
    )
    .describe('3-4 things to expect during the festival'),
  orders: z.array(
    z.object({
      stockId: z.enum(stockIds).describe('Which inventory item this is; "other" if not in current stock'),
      item: z.string(),
      quantity: z.number().describe('How much to order'),
      unit: z.string(),
      expectedUse: z.number().describe('How much we expect to use over the whole festival, same unit'),
      orderBy: z.string().describe('Date to place the order, YYYY-MM-DD'),
      supplierId: z.enum(supplierIds),
      why: z.string().describe('One plain sentence, no jargon'),
      lastTime: z.string().describe('What happened with this item at this festival before, in one short sentence with the year. Empty string if unknown.'),
    }),
  ),
  menu: z.array(z.object({ change: z.string(), why: z.string() })),
  risks: z.array(z.object({ risk: z.string(), mitigation: z.string() })),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type Plan = z.infer<typeof PlanSchema>;
export type PlanOrder = Plan['orders'][number];

export const planJsonSchema = z.toJSONSchema(PlanSchema) as Record<string, unknown>;

export type Evidence = { id?: string; text: string; type?: string; when?: string };

export type PlanResult = {
  mode: 'none' | 'firstSeason' | 'full';
  plan: Plan;
  evidence: Evidence[];
  recalled: Evidence[];
  ms: number;
  notes: string[];
};

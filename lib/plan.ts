import { z } from 'zod';

// One shape for every plan, with or without memory, so the UI can compare
// them column by column.
export const PlanSchema = z.object({
  headline: z.string(),
  orders: z.array(
    z.object({
      item: z.string(),
      quantity: z.number(),
      unit: z.string(),
      orderBy: z.string(),
      supplier: z.string(),
      why: z.string(),
    }),
  ),
  menu: z.array(z.object({ change: z.string(), why: z.string() })),
  risks: z.array(z.object({ risk: z.string(), mitigation: z.string() })),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type Plan = z.infer<typeof PlanSchema>;

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

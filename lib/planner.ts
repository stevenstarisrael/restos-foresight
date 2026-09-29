import { outlet, stock, suppliers, today, upcomingFestivals, type Festival } from '@/data/outlet';
import { BANKS, hindsight, PLAYBOOK, type MemoryMode } from './hindsight';

const PLAYBOOK_FESTIVAL = 'diwali';
import { planFromLLM } from './llm';
import { PlanSchema, planJsonSchema, type Evidence, type Plan, type PlanResult } from './plan';

export function findFestival(id: string): Festival {
  const festival = upcomingFestivals.find((f) => f.id === id);
  if (!festival) throw new Error(`Unknown festival: ${id}`);
  return festival;
}

// The same live restOS snapshot goes to every mode. The only difference
// between the columns in the demo is what the agent remembers.
function situation(festival: Festival): string {
  const stockLines = stock.map(
    (s) => `- ${s.name}: ${s.onHand} ${s.unit} on hand, normal use ${s.normalDailyUse} ${s.unit}/day, ₹${s.costPerUnit}/${s.unit}, supplier ${s.supplierId}`,
  );
  const supplierLines = suppliers.map((s) => `- ${s.id}: ${s.name} - ${s.supplies}; lead time ${s.leadTimeDays} day(s). ${s.note}`);
  return [
    `Today is ${today()}. Outlet: ${outlet.name}, ${outlet.city} (${outlet.covers} covers, ${outlet.cuisine}).`,
    `Upcoming festival: ${festival.name} on ${festival.date}. ${festival.note}.`,
    `Team: ${outlet.team.rostered} staff on the regular roster (${outlet.team.cooks} cooks, ${outlet.team.deliveryRiders} delivery riders). Online store: about ${outlet.onlineOrdersPerHourNormalPeak} orders/hour at a normal peak, hosted on restOS.`,
    'Current stock:',
    ...stockLines,
    'Suppliers:',
    ...supplierLines,
  ].join('\n');
}

const TASK =
  'Produce a festival prep plan: what to order (quantity, unit, order-by date, supplier), staff and online-ordering capacity actions, menu changes, and the main risks with mitigations. ' +
  'Be specific with numbers. Write for a restaurant owner with no technical background: short plain sentences, no jargon. ' +
  'Use supplier ids and stock ids exactly as listed. Dates as YYYY-MM-DD.';

// Only given to the memory modes: how to use history, not what the history says.
const MEMORY_GUIDANCE =
  'Size each quantity from the most recent actual usage on record for this festival (not the plan), adjusted for the year-on-year trend, ' +
  'and check the latest supplier prices and reliability before choosing a supplier. ' +
  'For staffing and the online store, start from the most recent outcome for this festival: keep what worked, and fix what still fell short. ' +
  'Only include capacity actions that address something on record, with dates before the festival. ' +
  'In each lastTime, state one specific remembered fact about that item or action at this festival (a quantity, time, price or event, with the year). ' +
  'If memory has nothing specific about it at this festival, leave lastTime empty rather than writing something general.';

export async function runPlan(mode: MemoryMode, festivalId: string): Promise<PlanResult> {
  const started = Date.now();
  const festival = findFestival(festivalId);
  const context = situation(festival);

  const client = hindsight();
  const bank = BANKS[mode];
  const notes: string[] = [];
  const query = `Plan ${festival.name} (${festival.date}) for Spice Garden. ${TASK} ${MEMORY_GUIDANCE}`;

  // Recall runs alongside reflect purely so the UI can show what the memory
  // layer surfaced; reflect does its own retrieval internally.
  const [recall, reflect] = await Promise.all([
    client.recall(bank, `${festival.name.replace(/\s\d{4}$/, '')}: stock-outs, waste, supplier problems, customer requests, past plans and outcomes`, {
      types: ['observation', 'world', 'experience'],
      budget: 'mid',
      maxTokens: 2048,
      queryTimestamp: `${today()}T10:00:00+05:30`,
    }),
    client.reflect(bank, query, {
      context,
      budget: 'mid',
      responseSchema: planJsonSchema,
      includeFacts: true,
      // Plan from this festival's memories (plus untagged ones), and don't let
      // the Diwali playbook leak Diwali numbers into other festivals.
      tags: [`festival:${festival.id}`],
      tagsMatch: 'any',
      ...(festival.id === PLAYBOOK_FESTIVAL ? {} : { excludeMentalModelIds: [PLAYBOOK.id] }),
    }),
  ]);

  let plan: Plan;
  const structured = PlanSchema.safeParse(reflect.structured_output);
  if (structured.success) {
    plan = structured.data;
  } else {
    // Reflect still produced a grounded answer in prose; convert it rather
    // than failing the demo.
    notes.push('Structured output missing from reflect - converted reflect text with the LLM');
    plan = await planFromLLM(
      'Convert this memory-grounded festival plan into the JSON schema. Keep every number, date, supplier and cited past event exactly as written.',
      reflect.text,
    );
  }

  const evidence: Evidence[] = [
    ...(reflect.based_on?.mental_models ?? []).map((m) => ({ id: m.id, text: m.text, type: 'mental model' })),
    ...(reflect.based_on?.memories ?? []).map((m) => ({
      id: m.id ?? undefined,
      text: m.text,
      type: m.type ?? undefined,
      when: m.occurred_start ?? undefined,
    })),
  ];
  if (mode === 'none') {
    // An empty bank has no "last time"; anything the model writes there is invented.
    const blank = <T extends { lastTime: string }>(x: T) => ({ ...x, lastTime: '' });
    plan = { ...plan, orders: plan.orders.map(blank), capacity: (plan.capacity ?? []).map(blank) };
    notes.push('Empty memory bank - same agent, nothing remembered');
  }
  const directives = reflect.based_on?.directives ?? [];
  if (directives.length) notes.push(`Directives applied: ${directives.map((d) => d.name).join(', ')}`);
  const recalled: Evidence[] = recall.results.map((r) => ({
    id: r.id,
    text: r.text,
    type: r.type ?? undefined,
    when: r.occurred_start ?? r.mentioned_at ?? undefined,
  }));

  return { mode, plan, evidence, recalled, ms: Date.now() - started, notes };
}

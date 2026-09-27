'use client';

import { ArrowRight, Brain, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import { ITEM_ICON, rupees, summarize, tidy, type Urgency } from '@/lib/insights';
import { buildRows, score } from '@/lib/readiness';
import { MODE_COLOR, MODES, type ColumnState, type Mode } from './plan-view';

// The first screen of the dashboard: what to do (from the full-memory plan)
// and why to trust it (how each plan would have fared). Everything below it on
// the page is supporting detail.

const URGENCY_CHIP: Record<Urgency, string> = {
  late: 'bg-chili text-white',
  now: 'bg-chili-soft text-chili',
  soon: 'bg-saffron-soft text-amber-800',
  later: 'bg-stone-100 text-stone-600',
};

export function AtAGlance({
  festival,
  columns,
  onPlan,
  onOpenPlan,
}: {
  festival: string;
  columns: Record<Mode, ColumnState>;
  onPlan: () => void;
  onOpenPlan: () => void;
}) {
  const full = columns.full;
  const plans = Object.fromEntries(MODES.flatMap(({ mode }) => (columns[mode].result ? [[mode, columns[mode].result!.plan]] : [])));
  const rows = buildRows(festival, plans);
  const anyLoading = MODES.some((m) => columns[m.mode].loading);

  if (!full.result) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white p-10 text-center">
        {anyLoading ? (
          <p className="text-sm text-muted">Planning from memory…</p>
        ) : (
          <>
            <p className="text-sm text-muted">No plan yet for this festival.</p>
            <button onClick={onPlan} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-saffron px-4 py-2 text-sm font-medium text-white">
              Plan all three <ArrowRight size={15} aria-hidden />
            </button>
          </>
        )}
      </div>
    );
  }

  const plan = full.result.plan;
  const summary = summarize(plan, festival);
  const actions = summary.orders.slice(0, 4);
  const more = summary.orders.length - actions.length;
  const topMenu = plan.menu[0];
  const none = columns.none.result ? { s: score(rows, 'none'), spend: summarize(columns.none.result.plan, festival).totalCost } : null;
  const memories = full.result.evidence.filter((e) => e.type !== 'mental model').length || full.result.recalled.length;
  const usedPlaybook = full.result.evidence.some((e) => e.type === 'mental model');

  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      {/* Do this */}
      <section className="rounded-2xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CheckCircle2 size={18} className="text-leaf" aria-hidden /> Do this
          </h2>
          <span className="text-sm text-muted">
            {summary.itemCount} orders · <b className="text-ink">{rupees(summary.totalCost)}</b> total
          </span>
        </div>

        <ul className="mt-3 divide-y divide-line">
          {actions.map((o, i) => (
            <li key={i} className="flex items-start gap-3 py-2.5">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-paper text-base">{ITEM_ICON[o.stockId] ?? ITEM_ICON.other}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold">
                    Order {fmt(o.quantity)} {o.unit} {o.item}
                  </span>
                  <span className="text-xs text-muted">
                    {o.supplierName.replace(/\s*\(.*\)$/, '')}
                    {o.cost !== null && ` · ${rupees(o.cost)}`}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-leaf">
                  {o.lastTime.trim() ? (
                    <>
                      <Brain size={11} className="mr-1 inline" aria-hidden />
                      {tidy(o.lastTime)}
                    </>
                  ) : (
                    <span className="text-muted">{tidy(o.why)}</span>
                  )}
                </p>
              </div>
              <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${URGENCY_CHIP[o.urgency]}`}>
                by {shortDate(o.orderBy)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
          <span className="min-w-0 text-muted">
            {topMenu && (
              <>
                🍽️ <span className="text-ink">{tidy(topMenu.change)}</span>
              </>
            )}
          </span>
          <button onClick={onOpenPlan} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink hover:underline">
            {more > 0 ? `+${more} more · ` : ''}Full plan <ArrowRight size={14} aria-hidden />
          </button>
        </div>
      </section>

      {/* Why trust it */}
      <section className="flex flex-col rounded-2xl border border-line bg-white p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck size={18} className="text-leaf" aria-hidden /> Why trust it
        </h2>
        <p className="mt-1 text-xs text-muted">Share of this festival’s likely need each plan covers (restOS records).</p>

        <div className="mt-4 space-y-3">
          {MODES.map(({ mode, title }) => {
            const s = columns[mode].result ? score(rows, mode) : null;
            return (
              <div key={mode}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: MODE_COLOR[mode] }} />
                    {title}
                  </span>
                  <span className="flex items-center gap-1 font-semibold tabular-nums">
                    {s ? (
                      <>
                        {s.readiness >= 100 ? <CheckCircle2 size={14} className="text-leaf" aria-hidden /> : <XCircle size={14} className="text-chili" aria-hidden />}
                        {s.readiness}%
                      </>
                    ) : (
                      <span className="text-xs font-normal text-muted">not planned</span>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-stone-100">
                  <div className="h-2 rounded-full transition-[width] duration-700" style={{ width: `${s?.readiness ?? 0}%`, background: MODE_COLOR[mode] }} />
                </div>
              </div>
            );
          })}
        </div>

        {none?.s && none.s.short.length > 0 && (
          <p className="mt-4 rounded-lg bg-chili-soft/60 p-3 text-sm leading-snug text-ink">
            Without memory, the AI spends <b>{rupees(none.spend)}</b> and still runs short on{' '}
            <b>{none.s.short.map((x) => x.replace(/\s*\(.*\)$/, '').toLowerCase()).join(', ')}</b>.
          </p>
        )}

        <p className="mt-auto flex items-center gap-1.5 pt-4 text-xs text-muted">
          <Brain size={13} aria-hidden />
          Built from {usedPlaybook ? 'the Diwali playbook + ' : ''}
          {memories} past events in Hindsight memory
        </p>
      </section>
    </div>
  );
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function shortDate(iso: string) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? iso : new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

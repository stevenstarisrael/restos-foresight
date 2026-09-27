'use client';

import { useState } from 'react';
import { Brain, CircleOff, Eye, EyeOff, Globe, History, Loader2, Play, RotateCw, Settings2, Users, type LucideIcon } from 'lucide-react';
import { outlet } from '@/data/outlet';
import type { Plan, PlanResult } from '@/lib/plan';
import { daysFromToday, ITEM_ICON, rupees, summarize, tidy, type OrderInsight, type Urgency } from '@/lib/insights';

export type Mode = PlanResult['mode'];
export type ColumnState = { loading: boolean; result?: PlanResult; error?: string };

export const MODES: { mode: Mode; title: string; subtitle: string; badge: string }[] = [
  { mode: 'none', title: 'No memory', subtitle: 'A plain AI with today’s stock', badge: 'bg-stone-100 text-stone-700' },
  { mode: 'firstSeason', title: 'After 1 season', subtitle: 'Remembers Dussehra & Diwali 2024', badge: 'bg-saffron-soft text-amber-800' },
  { mode: 'full', title: 'After 2 years', subtitle: 'Remembers every festival since 2024', badge: 'bg-leaf-soft text-leaf' },
];

// Ordinal green ramp: more memory = deeper green. Validated with the dataviz
// palette checker (--ordinal, light surface): monotone, single hue, light end >= 2:1.
export const MODE_COLOR: Record<Mode, string> = {
  none: '#7cc190',
  firstSeason: '#2b9a50',
  full: '#0f5f32',
};

export const MODE_ICON: Record<Mode, LucideIcon> = { none: CircleOff, firstSeason: History, full: Brain };

// ── Comparison strip ────────────────────────────────────────────────────────

export function CompareCard({
  mode,
  state,
  selected,
  onSelect,
  onRun,
}: {
  mode: Mode;
  state: ColumnState;
  selected: boolean;
  onSelect: () => void;
  onRun: () => void;
}) {
  const meta = MODES.find((m) => m.mode === mode)!;
  const result = state.result;
  const summary = result ? summarize(result.plan) : null;
  const lessons = result ? lessonCount(result) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      className={`cursor-pointer rounded-xl border bg-white p-4 text-left transition ${
        selected ? 'border-ink ring-2 ring-ink/10' : 'border-line hover:border-stone-400'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: MODE_COLOR[mode] }} />
            {meta.title}
          </span>
          <div className="mt-1 text-xs text-muted">{meta.subtitle}</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRun();
          }}
          disabled={state.loading}
          title={result ? 'Regenerate this plan (uses API credits)' : undefined}
          className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs hover:bg-stone-50 disabled:opacity-50"
        >
          {state.loading ? <Loader2 size={13} className="animate-spin" aria-hidden /> : result ? <RotateCw size={13} aria-hidden /> : <Play size={13} aria-hidden />}
          {state.loading ? 'Thinking…' : result ? 'Re-run' : 'Run'}
        </button>
      </div>

      {state.loading && (
        <div className="mt-4 space-y-2">
          <div className="h-3 w-4/5 animate-pulse rounded bg-stone-100" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-stone-100" />
          <div className="mt-3 h-8 animate-pulse rounded bg-stone-100" />
        </div>
      )}
      {state.error && <p className="mt-3 rounded-md bg-chili-soft p-2 text-xs text-chili">{state.error}</p>}
      {!state.loading && !result && !state.error && <p className="mt-4 text-sm text-muted">Not planned yet.</p>}

      {!state.loading && result && summary && (
        <>
          <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug">{tidy(result.plan.headline)}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat value={rupees(summary.totalCost)} label="to spend" />
            <Stat value={String(summary.itemCount)} label="items" />
            <Stat value={mode === 'none' ? '0' : String(lessons)} label="past lessons" tone={mode === 'none' ? 'muted' : 'leaf'} />
          </div>
          <div className="mt-2 text-[11px] text-muted" title={result.cachedAt ? 'Served from saved results - no API credits used. Re-run to regenerate.' : undefined}>
            {result.cachedAt ? `💾 Saved result · ${timeAgo(result.cachedAt)}` : `⚡ Fresh · generated in ${(result.ms / 1000).toFixed(1)}s`}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: 'muted' | 'leaf' }) {
  const color = tone === 'leaf' ? 'text-leaf' : tone === 'muted' ? 'text-muted' : 'text-ink';
  return (
    <div className="rounded-lg bg-paper px-2 py-2">
      <div className={`text-base font-semibold ${color}`}>{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}

function lessonCount(result: PlanResult) {
  const fromMemory = [...result.plan.orders, ...(result.plan.capacity ?? [])].filter((o) => o.lastTime.trim()).length;
  return fromMemory + (result.evidence.some((e) => e.type === 'mental model') ? 1 : 0);
}

// ── Detailed plan ───────────────────────────────────────────────────────────

export function PlanDetail({ state, mode, festival }: { state: ColumnState; mode: Mode; festival: string }) {
  const meta = MODES.find((m) => m.mode === mode)!;
  if (state.loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
    );
  }
  if (!state.result) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
        {state.error ? 'This plan failed - try Re-run.' : `Press “Plan all three” or Run on “${meta.title}” to see the plan.`}
      </div>
    );
  }

  const { plan } = state.result;
  const summary = summarize(plan, festival);
  const noMemory = mode === 'none';

  return (
    <div className="space-y-6">
      <div className={`rounded-xl p-5 ${noMemory ? 'bg-stone-800 text-white' : 'bg-ink text-white'}`}>
        <div className="text-xs uppercase tracking-wide opacity-70">
          The plan · {meta.title} {noMemory ? '· generic guess' : `· confidence ${plan.confidence}`}
        </div>
        <p className="mt-1 text-lg font-medium leading-snug sm:text-xl">{tidy(plan.headline)}</p>
      </div>

      <Section title="What to expect" hint="How this festival will likely go">
        <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
          {plan.expectations.map((e, i) => (
            <div key={i} className="rounded-xl border border-line bg-white p-4">
              <div className="text-xs font-medium text-muted">{e.title}</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{e.value}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{tidy(e.detail)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="What to order" hint="Sorted by when you need to place the order">
        <div className="mb-3 grid gap-3 sm:grid-cols-4">
          <BudgetTile label="Total spend" value={rupees(summary.totalCost)} note="at current restOS prices" />
          <BudgetTile label="Items to order" value={String(summary.itemCount)} />
          <BudgetTile
            label="First order due"
            value={summary.firstOrderDays === null ? '—' : summary.firstOrderDays <= 0 ? 'Today' : `in ${summary.firstOrderDays} days`}
          />
          <BudgetTile
            label="Need action this week"
            value={String(summary.urgentCount + summary.orders.filter((o) => o.urgency === 'soon').length)}
            tone={summary.urgentCount ? 'chili' : undefined}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {summary.orders.map((o, i) => (
            <OrderCard key={i} order={o} noMemory={noMemory} />
          ))}
        </div>
      </Section>

      {(plan.capacity ?? []).length > 0 && (
        <Section title="Staff & systems" hint="People on shift and online ordering capacity">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(plan.capacity ?? []).map((c, i) => (
              <CapacityCard key={i} item={c} noMemory={noMemory} />
            ))}
          </div>
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {plan.menu.length > 0 && (
          <Section title="Menu moves" hint="What to add, push or cut">
            <div className="space-y-2">
              {plan.menu.map((m, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-line bg-white p-3">
                  <div className="text-xl">🍽️</div>
                  <div>
                    <div className="text-sm font-medium">{tidy(m.change)}</div>
                    <p className="text-xs text-muted">{tidy(m.why)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
        {plan.risks.length > 0 && (
          <Section title="Watch out for" hint="What could go wrong, and what to do about it">
            <div className="space-y-2">
              {plan.risks.map((r, i) => (
                <div key={i} className="rounded-xl border border-line bg-white p-3">
                  <div className="flex gap-2 text-sm font-medium">
                    <span>⚠️</span>
                    <span>{tidy(r.risk)}</span>
                  </div>
                  <div className="mt-1 flex gap-2 text-xs text-muted">
                    <span>✅</span>
                    <span>{tidy(r.mitigation)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      <MemoryFooter result={state.result} />
    </div>
  );
}

const URGENCY: Record<Urgency, { label: (d: number | null) => string; className: string }> = {
  late: { label: () => 'Overdue - order today', className: 'bg-chili text-white' },
  now: { label: (d) => (d === 0 ? 'Order today' : `Order in ${d} day${d === 1 ? '' : 's'}`), className: 'bg-chili-soft text-chili' },
  soon: { label: (d) => `Order in ${d} days`, className: 'bg-saffron-soft text-amber-800' },
  later: { label: (d) => (d === null ? 'No date' : `Order in ${d} days`), className: 'bg-leaf-soft text-leaf' },
};

function OrderCard({ order: o, noMemory }: { order: OrderInsight; noMemory: boolean }) {
  const urgency = URGENCY[o.urgency];
  const scale = Math.max(o.afterOrder ?? o.quantity, o.need, 1) * 1.08;
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;

  return (
    <div className="flex flex-col rounded-xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-paper text-lg">{ITEM_ICON[o.stockId] ?? ITEM_ICON.other}</span>
          <div>
            <div className="text-sm font-semibold">{o.item}</div>
            <div className="text-[11px] text-muted">{o.supplierName}</div>
          </div>
        </div>
        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${urgency.className}`}>
          {urgency.label(o.daysLeft)}
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-semibold tracking-tight">
          {fmt(o.quantity)} <span className="text-base font-normal text-muted">{o.unit}</span>
        </div>
        {o.cost !== null && <div className="text-sm font-medium text-muted">≈ {rupees(o.cost)}</div>}
      </div>
      <div className="text-[11px] text-muted">Place order by {prettyDate(o.orderBy)}</div>

      {o.onHand !== null && (
        <div className="mt-3">
          <div className="relative h-2.5 rounded-full bg-stone-100">
            <div className="absolute inset-y-0 left-0 rounded-full bg-saffron/40" style={{ width: pct(o.afterOrder ?? 0) }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-stone-500" style={{ width: pct(o.onHand) }} />
            {o.need > 0 && (
              <div
                className={`absolute -top-1 h-4.5 w-0.5 ${o.shortfall ? 'bg-chili' : 'bg-ink'}`}
                style={{ left: pct(o.need) }}
                title={o.needSource === 'records' ? 'Likely need: last year’s use + growth (restOS records)' : 'The plan’s own estimate'}
              />
            )}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted">
            <span>
              <b className="text-ink">{fmt(o.onHand)}</b> in stock
            </span>
            <span>
              {o.needSource === 'records' ? 'likely need' : 'plan expects'} <b className={o.shortfall ? 'text-chili' : 'text-ink'}>~{fmt(o.need)}</b>
            </span>
            <span>
              <b className="text-ink">{fmt(o.afterOrder ?? 0)}</b> after order
            </span>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed">{tidy(o.why)}</p>

      <div className="mt-auto pt-3">
        {o.lastTime.trim() ? (
          <div className="rounded-lg bg-leaf-soft/60 p-2 text-xs text-leaf">
            <span className="font-semibold">🧠 Last time: </span>
            {tidy(o.lastTime)}
          </div>
        ) : !noMemory && o.record ? (
          <div className="rounded-lg bg-stone-100 p-2 text-xs text-stone-600">
            <span className="font-semibold">📋 restOS records: </span>
            {o.record}
          </div>
        ) : (
          <div className="rounded-lg bg-stone-100 p-2 text-xs text-muted">
            {noMemory ? '🤷 No history - this is a guess' : 'No past record for this item'}
          </div>
        )}
      </div>
    </div>
  );
}

export const AREA_ICON: Record<string, LucideIcon> = { staff: Users, online: Globe, other: Settings2 };

function CapacityCard({ item: c, noMemory }: { item: NonNullable<Plan['capacity']>[number]; noMemory: boolean }) {
  const Icon = AREA_ICON[c.area] ?? Settings2;
  const days = daysFromToday(c.by);
  const urgency: Urgency = days === null ? 'later' : days < 0 ? 'late' : days <= 3 ? 'now' : days <= 10 ? 'soon' : 'later';
  const chip = URGENCY[urgency];
  return (
    <div className="flex flex-col rounded-xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-700">
            <Icon size={18} aria-hidden />
          </span>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{c.area === 'online' ? 'Online store' : c.area === 'staff' ? 'Staff' : 'Operations'}</div>
        </div>
        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.className}`}>
          {urgency === 'late' || urgency === 'now' || days === null ? chip.label(days) : `Due in ${days} days`}
        </span>
      </div>
      <div className="mt-3 text-sm font-semibold leading-snug">{tidy(c.action)}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{tidy(c.target)}</div>
      {c.area === 'staff' && <div className="text-[11px] text-muted">{outlet.team.rostered} on the regular roster today</div>}
      <p className="mt-2 text-xs leading-relaxed">{tidy(c.why)}</p>
      <div className="mt-auto pt-3">
        {c.lastTime.trim() ? (
          <div className="rounded-lg bg-leaf-soft/60 p-2 text-xs text-leaf">
            <span className="font-semibold">🧠 Last time: </span>
            {tidy(c.lastTime)}
          </div>
        ) : (
          <div className="rounded-lg bg-stone-100 p-2 text-xs text-muted">{noMemory ? '🤷 No history - this is a guess' : 'No past record'}</div>
        )}
      </div>
    </div>
  );
}

function BudgetTile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'chili' }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-xl font-semibold ${tone === 'chili' ? 'text-chili' : ''}`}>{value}</div>
      {note && <div className="text-[11px] text-muted">{note}</div>}
    </div>
  );
}

function MemoryFooter({ result }: { result: PlanResult }) {
  const [open, setOpen] = useState(false);
  if (result.mode === 'none') {
    return <p className="text-xs text-muted">This plan used no memory - the AI only saw today’s stock and supplier list.</p>;
  }
  const items = result.evidence.length ? result.evidence : result.recalled;
  const usedPlaybook = result.evidence.some((e) => e.type === 'mental model');
  return (
    <div className="rounded-xl border border-line bg-white p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted">
          🧠 Built from memory: {usedPlaybook && <b className="text-ink">the Diwali playbook + </b>}
          <b className="text-ink">{items.filter((e) => e.type !== 'mental model').length || result.recalled.length} past events</b>
          {result.notes.length > 0 && ` · ${result.notes.join(' · ')}`} · {(result.ms / 1000).toFixed(1)}s
        </span>
        <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 underline underline-offset-2">
          {open ? <EyeOff size={13} aria-hidden /> : <Eye size={13} aria-hidden />}
          {open ? 'Hide' : 'Show'} what it remembered
        </button>
      </div>
      {open && (
        <ul className="mt-3 grid max-h-80 gap-1.5 overflow-y-auto md:grid-cols-2">
          {items.map((e, i) => (
            <li key={e.id ?? i} className="rounded-md bg-paper p-2">
              <span className="mr-1 rounded bg-stone-200 px-1 text-[10px] uppercase text-stone-600">{e.type ?? 'memory'}</span>
              {e.when && <span className="mr-1 text-muted">{e.when.slice(0, 10)}</span>}
              {e.type === 'mental model' ? `${e.text.slice(0, 280)}…` : e.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function prettyDate(iso: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

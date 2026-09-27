'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { outlet, stock, TODAY, upcomingFestivals } from '@/data/outlet';
import { history } from '@/data/history';
import type { PlanResult } from '@/lib/plan';

type Mode = PlanResult['mode'];

const COLUMNS: { mode: Mode; title: string; subtitle: string }[] = [
  { mode: 'none', title: 'No memory', subtitle: 'A plain LLM with today’s stock' },
  { mode: 'firstSeason', title: 'After 1 season', subtitle: 'Remembers Dussehra & Diwali 2024' },
  { mode: 'full', title: 'After 2 years', subtitle: `${history.length} events, plans and outcomes` },
];

type ColumnState = { loading: boolean; result?: PlanResult; error?: string };

type Belief = { id: string; text: string; proofCount: number };
type MemoryState = { counts?: Record<string, number>; beliefs: Belief[]; error?: string };

const SUGGESTIONS = [
  { kind: 'lost_demand', text: 'This week about 20 regulars asked if we will have sugar-free or jaggery sweets for Diwali — diabetic parents at home.' },
  { kind: 'supplier', text: 'Sri Lakshmi Dairy says ghee will be ₹680/kg from 15 Oct and they need 5 days notice for bulk orders above 10 kg this Diwali.' },
  { kind: 'staff_note', text: 'Two corporate clients (Hitec City) already called asking to book Diwali kaju katli boxes — around 150 boxes together.' },
];

export default function Home() {
  const [festival, setFestival] = useState('diwali');
  const [columns, setColumns] = useState<Record<Mode, ColumnState>>({
    none: { loading: false },
    firstSeason: { loading: false },
    full: { loading: false },
  });
  const [memory, setMemory] = useState<MemoryState>({ beliefs: [] });
  const [playbook, setPlaybook] = useState<{ content?: string; refreshedAt?: string | null; error?: string }>({});

  const runColumn = useCallback(async (mode: Mode, fest: string) => {
    setColumns((c) => ({ ...c, [mode]: { loading: true } }));
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, festival: fest }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setColumns((c) => ({ ...c, [mode]: { loading: false, result: data } }));
    } catch (err) {
      setColumns((c) => ({ ...c, [mode]: { loading: false, error: err instanceof Error ? err.message : String(err) } }));
    }
  }, []);

  const loadMemory = useCallback(async () => {
    try {
      const res = await fetch('/api/memory?bank=full');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMemory({ counts: data.counts, beliefs: data.beliefs });
    } catch (err) {
      setMemory({ beliefs: [], error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const loadPlaybook = useCallback(async () => {
    try {
      const res = await fetch('/api/playbook');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlaybook(data);
    } catch (err) {
      setPlaybook({ error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  useEffect(() => {
    loadMemory();
    loadPlaybook();
    // ?run=1 plans all three columns on load (handy for recording the demo).
    const params = new URLSearchParams(window.location.search);
    if (params.has('run')) {
      const fest = params.get('festival') ?? 'diwali';
      setFestival(fest);
      COLUMNS.forEach((c) => runColumn(c.mode, fest));
    }
  }, [loadMemory, loadPlaybook, runColumn]);

  const current = upcomingFestivals.find((f) => f.id === festival)!;
  const daysAway = Math.round((Date.parse(current.date) - Date.parse(TODAY)) / 86_400_000);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-24 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-saffron text-lg font-bold text-white">F</div>
          <div>
            <div className="font-semibold leading-tight">restOS Foresight</div>
            <div className="text-xs text-muted">Festival demand memory · powered by Hindsight</div>
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="font-medium">{outlet.name}</div>
          <div className="text-xs text-muted">Today {formatDate(TODAY)}</div>
        </div>
      </header>

      <section className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {current.name} is {daysAway} days away. What should we order?
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Same stock, same suppliers, same model. The only difference between the three plans below is what the agent remembers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-line bg-white p-1 text-sm">
            {upcomingFestivals.map((f) => (
              <button
                key={f.id}
                onClick={() => setFestival(f.id)}
                className={`rounded-md px-3 py-1.5 ${festival === f.id ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
              >
                {f.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => COLUMNS.forEach((c) => runColumn(c.mode, festival))}
            className="rounded-lg bg-saffron px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Plan all three
          </button>
        </div>
      </section>

      <StockStrip />

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <PlanColumn key={col.mode} {...col} state={columns[col.mode]} onRun={() => runColumn(col.mode, festival)} />
        ))}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <TeachPanel
          festival={festival}
          onTaught={() => {
            loadMemory();
          }}
          onReplan={() => runColumn('full', festival)}
        />
        <BeliefsPanel memory={memory} onReload={loadMemory} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <PlaybookPanel playbook={playbook} onReload={loadPlaybook} />
        <TimelinePanel />
      </section>
    </main>
  );
}

function StockStrip() {
  return (
    <section className="mt-5 overflow-x-auto">
      <div className="flex min-w-max gap-2">
        {stock.map((s) => {
          const cover = s.onHand / s.normalDailyUse;
          const tone = cover < 3 ? 'text-chili' : cover < 6 ? 'text-saffron' : 'text-leaf';
          return (
            <div key={s.id} className="rounded-lg border border-line bg-white px-3 py-2">
              <div className="text-xs text-muted">{s.name}</div>
              <div className="text-sm font-medium">
                {s.onHand} {s.unit} <span className={`text-xs font-normal ${tone}`}>· {cover.toFixed(1)}d cover</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PlanColumn({
  mode,
  title,
  subtitle,
  state,
  onRun,
}: {
  mode: Mode;
  title: string;
  subtitle: string;
  state: ColumnState;
  onRun: () => void;
}) {
  const accent = mode === 'none' ? 'bg-stone-100 text-stone-700' : mode === 'firstSeason' ? 'bg-saffron-soft text-amber-800' : 'bg-leaf-soft text-leaf';
  const plan = state.result?.plan;
  const [showEvidence, setShowEvidence] = useState(false);
  const evidence = state.result?.evidence.length ? state.result.evidence : state.result?.recalled ?? [];

  return (
    <article className="flex flex-col rounded-xl border border-line bg-white">
      <div className="flex items-start justify-between gap-2 border-b border-line p-4">
        <div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${accent}`}>{title}</span>
          <div className="mt-1 text-xs text-muted">{subtitle}</div>
        </div>
        <button
          onClick={onRun}
          disabled={state.loading}
          className="rounded-md border border-line px-3 py-1 text-xs hover:bg-stone-50 disabled:opacity-50"
        >
          {state.loading ? 'Thinking…' : plan ? 'Re-run' : 'Run'}
        </button>
      </div>

      <div className="flex-1 p-4 text-sm">
        {state.loading && <Skeleton />}
        {state.error && <p className="rounded-md bg-chili-soft p-3 text-xs text-chili">{state.error}</p>}
        {!state.loading && !plan && !state.error && <p className="text-muted">Not run yet.</p>}
        {!state.loading && plan && (
          <div className="space-y-4">
            <p className="font-medium leading-snug">{plan.headline}</p>

            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Orders</h3>
              <ul className="divide-y divide-line rounded-lg border border-line">
                {plan.orders.map((o, i) => (
                  <li key={i} className="p-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className="font-medium">
                        {o.quantity} {o.unit} {o.item}
                      </span>
                      <span className="text-xs text-muted">
                        by {o.orderBy} · {o.supplier}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{o.why}</p>
                  </li>
                ))}
              </ul>
            </div>

            {plan.menu.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Menu</h3>
                <ul className="space-y-1.5">
                  {plan.menu.map((m, i) => (
                    <li key={i}>
                      <span className="font-medium">{m.change}</span>
                      <span className="text-xs text-muted"> — {m.why}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan.risks.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Risks</h3>
                <ul className="space-y-1.5">
                  {plan.risks.map((r, i) => (
                    <li key={i}>
                      <span className="font-medium">{r.risk}</span>
                      <span className="text-xs text-muted"> → {r.mitigation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {state.result && (
        <div className="border-t border-line p-3 text-xs text-muted">
          <div className="flex items-center justify-between">
            <span>
              {mode === 'none' ? 'No memories used' : groundingLabel(state.result)}{' '}
              · confidence {plan?.confidence} · {(state.result.ms / 1000).toFixed(1)}s
            </span>
            {evidence.length > 0 && (
              <button onClick={() => setShowEvidence((v) => !v)} className="underline underline-offset-2">
                {showEvidence ? 'Hide' : 'Show'} memories
              </button>
            )}
          </div>
          {state.result.notes.map((n) => (
            <div key={n} className="mt-1 italic">{n}</div>
          ))}
          {showEvidence && (
            <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
              {evidence.map((e, i) => (
                <li key={e.id ?? i} className="rounded-md bg-paper p-2 text-ink">
                  <span className="mr-1 rounded bg-stone-200 px-1 text-[10px] uppercase text-stone-600">{e.type ?? 'memory'}</span>
                  {e.when && <span className="mr-1 text-muted">{e.when.slice(0, 10)}</span>}
                  {e.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

function TeachPanel({ festival, onTaught, onReplan }: { festival: string; onTaught: () => void; onReplan: () => void }) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState('staff_note');
  const [status, setStatus] = useState<{ tone: 'ok' | 'err' | 'busy'; msg: string } | null>(null);

  async function submit() {
    setStatus({ tone: 'busy', msg: 'Retaining into memory…' });
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, kind, festival }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus({ tone: 'ok', msg: 'Retained. Re-run “After 2 years” to see it change the plan.' });
      setText('');
      onTaught();
    } catch (err) {
      setStatus({ tone: 'err', msg: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h2 className="font-semibold">Teach Foresight</h2>
      <p className="mt-0.5 text-xs text-muted">
        Things sales data never shows: what customers asked for, what suppliers told you, what went wrong.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            onClick={() => {
              setText(s.text);
              setKind(s.kind);
            }}
            className="rounded-full border border-line px-2.5 py-1 text-left text-xs text-muted hover:border-saffron hover:text-ink"
          >
            {s.text.slice(0, 48)}…
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="e.g. Customers keep asking for…"
        className="mt-3 w-full rounded-lg border border-line p-2.5 text-sm outline-none focus:border-saffron"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-md border border-line px-2 py-1.5 text-sm">
          <option value="staff_note">Staff note</option>
          <option value="lost_demand">Customer request we couldn’t serve</option>
          <option value="supplier">Supplier update</option>
          <option value="stockout">Stock-out</option>
          <option value="waste">Waste</option>
        </select>
        <button
          onClick={submit}
          disabled={text.trim().length < 10 || status?.tone === 'busy'}
          className="rounded-md bg-ink px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          Remember this
        </button>
        <button onClick={onReplan} className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-stone-50">
          Re-plan with full memory
        </button>
      </div>
      {status && (
        <p className={`mt-2 text-xs ${status.tone === 'err' ? 'text-chili' : status.tone === 'ok' ? 'text-leaf' : 'text-muted'}`}>{status.msg}</p>
      )}
    </div>
  );
}

function BeliefsPanel({ memory, onReload }: { memory: MemoryState; onReload: () => void }) {
  const max = Math.max(1, ...memory.beliefs.map((b) => b.proofCount));
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">What it has learned</h2>
          <p className="mt-0.5 text-xs text-muted">
            Observations Hindsight consolidated from raw events. The bar shows how many memories back each one.
          </p>
        </div>
        <button onClick={onReload} className="text-xs text-muted underline underline-offset-2">
          Refresh
        </button>
      </div>
      {memory.counts && (
        <div className="mt-3 flex gap-2 text-xs">
          <Count label="facts" value={memory.counts.world} />
          <Count label="experiences" value={memory.counts.experience} />
          <Count label="observations" value={memory.counts.observation} />
        </div>
      )}
      {memory.error && <p className="mt-3 rounded-md bg-chili-soft p-3 text-xs text-chili">{memory.error}</p>}
      <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {memory.beliefs.map((b) => (
          <li key={b.id} className="text-sm">
            <div>{b.text}</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-stone-100">
                <div className="h-1.5 rounded-full bg-leaf" style={{ width: `${(b.proofCount / max) * 100}%` }} />
              </div>
              <span className="w-16 text-right text-[11px] text-muted">{b.proofCount} proof{b.proofCount === 1 ? '' : 's'}</span>
            </div>
          </li>
        ))}
        {!memory.error && memory.beliefs.length === 0 && <li className="text-xs text-muted">No observations yet — run the seed script.</li>}
      </ul>
    </div>
  );
}

function PlaybookPanel({
  playbook,
  onReload,
}: {
  playbook: { content?: string; refreshedAt?: string | null; error?: string };
  onReload: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    setRefreshing(true);
    await fetch('/api/playbook', { method: 'POST' }).catch(() => undefined);
    // Refresh is asynchronous on the Hindsight side; give it a moment.
    setTimeout(() => {
      onReload();
      setRefreshing(false);
    }, 8000);
  }
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Diwali playbook</h2>
          <p className="mt-0.5 text-xs text-muted">
            A Hindsight mental model: a living summary rewritten from memory.
            {playbook.refreshedAt && ` Last refreshed ${new Date(playbook.refreshedAt).toLocaleString('en-IN')}.`}
          </p>
        </div>
        <button onClick={refresh} disabled={refreshing} className="rounded-md border border-line px-3 py-1 text-xs hover:bg-stone-50 disabled:opacity-50">
          {refreshing ? 'Rewriting…' : 'Rewrite from memory'}
        </button>
      </div>
      {playbook.error && <p className="mt-3 rounded-md bg-chili-soft p-3 text-xs text-chili">{playbook.error}</p>}
      <div className="playbook mt-3 max-h-[28rem] overflow-y-auto text-sm leading-relaxed">
        {playbook.content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{playbook.content}</ReactMarkdown>
        ) : (
          !playbook.error && <span className="text-xs text-muted">Generating…</span>
        )}
      </div>
    </div>
  );
}

const KIND_STYLE: Record<string, string> = {
  stockout: 'bg-chili-soft text-chili',
  lost_demand: 'bg-chili-soft text-chili',
  waste: 'bg-saffron-soft text-amber-800',
  supplier: 'bg-saffron-soft text-amber-800',
  plan: 'bg-sky-100 text-sky-800',
  outcome: 'bg-leaf-soft text-leaf',
  staff_note: 'bg-stone-100 text-stone-700',
  summary: 'bg-stone-100 text-stone-700',
};

function TimelinePanel() {
  const events = [...history].reverse();
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h2 className="font-semibold">Memory feed</h2>
      <p className="mt-0.5 text-xs text-muted">Two years of restOS events and Foresight’s own plans, retained with their real dates.</p>
      <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
        {events.map((e) => (
          <li key={e.id} className="text-sm">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted">{formatDate(e.at.slice(0, 10))}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${KIND_STYLE[e.kind]}`}>{e.kind.replace('_', ' ')}</span>
            </div>
            <div className="mt-0.5">{e.text}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-paper px-2 py-1">
      <span className="font-semibold">{value}</span> <span className="text-muted">{label}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[80, 95, 70, 90, 60].map((w, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-stone-100" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

function groundingLabel(result: PlanResult) {
  const models = result.evidence.filter((e) => e.type === 'mental model').length;
  const memories = result.evidence.length - models || result.recalled.length;
  return [models ? 'Used the Diwali playbook' : null, `${memories} memories recalled`].filter(Boolean).join(' + ');
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

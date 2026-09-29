'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, RefreshCw, Sparkles, WandSparkles, type LucideIcon } from 'lucide-react';
import { outlet, stock, today, upcomingFestivals } from '@/data/outlet';
import { AtAGlance } from '@/components/at-a-glance';
import { CompareCharts } from '@/components/compare-charts';
import {
  BeliefsPanel,
  formatDate,
  PlaybookPanel,
  TeachPanel,
  TimelinePanel,
  type MemoryState,
  type PlaybookState,
} from '@/components/memory-panels';
import { CompareCard, MODE_ICON, MODES, PlanDetail, type ColumnState, type Mode } from '@/components/plan-view';
import type { PlanResult } from '@/lib/plan';

const FESTIVAL_ICON: Record<string, LucideIcon> = { dussehra: Flame, diwali: Sparkles };

const EMPTY: Record<Mode, ColumnState> = {
  none: { loading: false },
  firstSeason: { loading: false },
  full: { loading: false },
};

export default function Home() {
  const [festival, setFestival] = useState('diwali');
  const [columns, setColumns] = useState<Record<Mode, ColumnState>>(EMPTY);
  const [selected, setSelected] = useState<Mode>('full');
  const [memory, setMemory] = useState<MemoryState>({ beliefs: [] });
  const [playbook, setPlaybook] = useState<PlaybookState>({});
  // Which festival is on screen, so a plan that finishes after a switch isn't
  // shown under the wrong festival.
  const festivalRef = useRef(festival);

  // force=false returns the saved plan when there is one (no API usage);
  // force=true always regenerates (Re-run / Hard refresh).
  const runColumn = useCallback(async (mode: Mode, fest: string, force = false) => {
    setColumns((c) => ({ ...c, [mode]: { loading: true } }));
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, festival: fest, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (festivalRef.current !== fest) return;
      setColumns((c) => ({ ...c, [mode]: { loading: false, result: data } }));
    } catch (err) {
      if (festivalRef.current !== fest) return;
      setColumns((c) => ({ ...c, [mode]: { loading: false, error: err instanceof Error ? err.message : String(err) } }));
    }
  }, []);

  const runAll = useCallback(
    (fest: string, force = false) => {
      MODES.forEach((m) => runColumn(m.mode, fest, force));
    },
    [runColumn],
  );

  // Fill the columns from saved plans only - never triggers a model call.
  const loadSaved = useCallback(async (fest: string) => {
    try {
      const res = await fetch(`/api/plan?festival=${fest}`);
      const saved = (await res.json()) as Partial<Record<Mode, PlanResult>>;
      if (festivalRef.current !== fest) return;
      setColumns({
        none: saved.none ? { loading: false, result: saved.none } : { loading: false },
        firstSeason: saved.firstSeason ? { loading: false, result: saved.firstSeason } : { loading: false },
        full: saved.full ? { loading: false, result: saved.full } : { loading: false },
      });
    } catch {
      setColumns(EMPTY);
    }
  }, []);

  const loadMemory = useCallback(async (force = false) => {
    try {
      const res = await fetch(`/api/memory?bank=full${force ? '&force=1' : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMemory({ counts: data.counts, beliefs: data.beliefs });
    } catch (err) {
      setMemory({ beliefs: [], error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const loadPlaybook = useCallback(async (force = false) => {
    try {
      const res = await fetch(`/api/playbook${force ? '?force=1' : ''}`);
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
    // ?run=1 plans all three on load (handy for recording the demo).
    const params = new URLSearchParams(window.location.search);
    const fest = params.get('festival') ?? 'diwali';
    festivalRef.current = fest;
    setFestival(fest);
    if (params.has('run')) runAll(fest);
    else loadSaved(fest);
  }, [loadMemory, loadPlaybook, runAll, loadSaved]);

  function switchFestival(id: string) {
    if (id === festival) return;
    festivalRef.current = id;
    setFestival(id);
    loadSaved(id); // plans are per festival; show that festival's saved plans, if any
  }

  function hardRefresh() {
    runAll(festival, true);
    loadMemory(true);
    loadPlaybook(true);
  }

  const busy = MODES.some((m) => columns[m.mode].loading);

  function openFullPlan() {
    setSelected('full');
    document.getElementById('plan')?.scrollIntoView({ behavior: 'smooth' });
  }

  const current = upcomingFestivals.find((f) => f.id === festival)!;
  const daysAway = Math.round((Date.parse(current.date) - Date.parse(today())) / 86_400_000);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-24 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
        <Link href="/" className="group flex items-center gap-3" title="Back to the story">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-saffron text-lg font-bold text-white">F</div>
          <div>
            <div className="font-semibold leading-tight">restOS Foresight</div>
            <div className="text-xs text-muted group-hover:text-ink">← The story · powered by Hindsight</div>
          </div>
        </Link>
        <div className="text-right text-sm">
          <div className="font-medium">{outlet.name}</div>
          <div className="text-xs text-muted">Today {formatDate(today())}</div>
        </div>
      </header>

      {/* First screen: the problem, what to do, and why to trust it. */}
      <section className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-saffron">Festival readiness with memory</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {current.name} is {daysAway} days away. Here’s how to get ready.
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            <span className="font-medium text-ink">{current.lesson}</span> Foresight remembers every festival (what ran out, what was
            wasted, who was short-staffed, what customers asked for) and plans the next one from it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-line bg-white p-1 text-sm">
            {upcomingFestivals.map((f) => {
              const Icon = FESTIVAL_ICON[f.id] ?? Sparkles;
              return (
                <button
                  key={f.id}
                  onClick={() => switchFestival(f.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 ${festival === f.id ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
                >
                  <Icon size={15} aria-hidden />
                  {f.name}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => runAll(festival)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-saffron px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
          >
            <WandSparkles size={16} aria-hidden />
            Plan all three
          </button>
          <button
            onClick={hardRefresh}
            disabled={busy}
            title="Ignore saved results and regenerate everything (uses API credits)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm text-muted hover:text-ink disabled:opacity-60"
          >
            <RefreshCw size={15} className={busy ? 'animate-spin' : ''} aria-hidden />
            Hard refresh
          </button>
        </div>
      </section>

      <div className="mt-5">
        <AtAGlance festival={festival} columns={columns} onPlan={() => runAll(festival)} onOpenPlan={openFullPlan} />
      </div>

      {/* Supporting detail */}
      <SectionHead
        title="Same AI, different memory"
        hint="Each plan saw the same stock and suppliers. Only what the agent remembers changes."
      />
      <section className="grid gap-3 lg:grid-cols-3">
        {MODES.map(({ mode }) => (
          <CompareCard
            key={mode}
            mode={mode}
            state={columns[mode]}
            selected={selected === mode}
            onSelect={() => setSelected(mode)}
            onRun={() => runColumn(mode, festival, true)}
          />
        ))}
      </section>
      <div className="mt-4">
        <CompareCharts festival={festival} columns={columns} />
      </div>

      <div id="plan" className="scroll-mt-4">
        <SectionHead title="The full plan" hint="Every order, what to expect, menu moves and risks.">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {MODES.map(({ mode, title }) => {
              const Icon = MODE_ICON[mode];
              return (
                <button
                  key={mode}
                  onClick={() => setSelected(mode)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${selected === mode ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted hover:text-ink'}`}
                >
                  <Icon size={14} aria-hidden />
                  {title}
                </button>
              );
            })}
          </div>
        </SectionHead>
        <StockSummary />
        <PlanDetail mode={selected} state={columns[selected]} festival={festival} />
      </div>

      <SectionHead title="The memory behind it" hint="Teach it something new, see what it has learned, and the history it plans from." />
      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <TeachPanel festival={festival} onTaught={() => loadMemory(true)} onReplan={() => runColumn('full', festival, true)} />
        <BeliefsPanel memory={memory} onReload={() => loadMemory(true)} festival={festival} />
      </section>
      <section className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <PlaybookPanel playbook={playbook} onReload={() => loadPlaybook(true)} festival={festival} />
        <TimelinePanel festival={festival} festivalName={current.name} />
      </section>
    </main>
  );
}

function SectionHead({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3 mt-12 flex flex-wrap items-end justify-between gap-3 border-t border-line pt-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

// Today's stock, collapsed to the one thing that matters: what is running low.
function StockSummary() {
  const withCover = stock.map((s) => ({ ...s, cover: s.onHand / s.normalDailyUse }));
  // Daily deliveries (milk, meat) always look low on days of cover; that's normal.
  const low = withCover.filter((s) => !s.daily && s.cover < 3).sort((a, b) => a.cover - b.cover);
  const daily = withCover.filter((s) => s.daily).map((s) => s.name.toLowerCase());
  return (
    <details className="group mb-4 rounded-xl border border-line bg-white px-4 py-3 text-sm">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium">Stock today</span>
        <span className="text-muted">
          {low.length ? (
            <>
              · <span className="text-chili">{low.length} items under 3 days</span>: {low.map((s) => `${s.name} (${s.cover.toFixed(1)}d)`).join(', ')}
            </>
          ) : (
            '· nothing under 3 days of cover'
          )}
          {daily.length > 0 && ` · ${daily.join(', ')} delivered daily`}
        </span>
        <span className="ml-auto text-xs text-muted underline underline-offset-2 group-open:hidden">Show all {stock.length}</span>
        <span className="ml-auto hidden text-xs text-muted underline underline-offset-2 group-open:inline">Hide</span>
      </summary>
      <div className="mt-3 flex flex-wrap gap-2">
        {withCover.map((s) => {
          const tone = s.daily ? 'text-muted' : s.cover < 3 ? 'text-chili' : s.cover < 6 ? 'text-saffron' : 'text-leaf';
          return (
            <div key={s.id} className="rounded-lg border border-line px-3 py-2">
              <div className="text-xs text-muted">{s.name}</div>
              <div className="text-sm font-medium">
                {s.onHand} {s.unit}{' '}
                <span className={`text-xs font-normal ${tone}`}>· {s.daily ? 'delivered daily' : `${s.cover.toFixed(1)} days left`}</span>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

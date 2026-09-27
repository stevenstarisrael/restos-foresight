'use client';

import { useCallback, useEffect, useState } from 'react';
import { outlet, stock, TODAY, upcomingFestivals } from '@/data/outlet';
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
import { CompareCard, MODES, PlanDetail, type ColumnState, type Mode } from '@/components/plan-view';

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

  const runAll = useCallback(
    (fest: string) => {
      MODES.forEach((m) => runColumn(m.mode, fest));
    },
    [runColumn],
  );

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
    // ?run=1 plans all three on load (handy for recording the demo).
    const params = new URLSearchParams(window.location.search);
    if (params.has('run')) {
      const fest = params.get('festival') ?? 'diwali';
      setFestival(fest);
      runAll(fest);
    }
  }, [loadMemory, loadPlaybook, runAll]);

  function switchFestival(id: string) {
    if (id === festival) return;
    setFestival(id);
    setColumns(EMPTY); // plans are per festival; don't show Diwali numbers under Dussehra
  }

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
            Same stock, same suppliers, same AI. The only difference between the three plans is how much the agent remembers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-line bg-white p-1 text-sm">
            {upcomingFestivals.map((f) => (
              <button
                key={f.id}
                onClick={() => switchFestival(f.id)}
                className={`rounded-md px-3 py-1.5 ${festival === f.id ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
              >
                {f.name}
              </button>
            ))}
          </div>
          <button onClick={() => runAll(festival)} className="rounded-lg bg-saffron px-4 py-2 text-sm font-medium text-white hover:brightness-110">
            Plan all three
          </button>
        </div>
      </section>

      <StockStrip />

      <section className="mt-6 grid gap-3 lg:grid-cols-3">
        {MODES.map(({ mode }) => (
          <CompareCard
            key={mode}
            mode={mode}
            state={columns[mode]}
            selected={selected === mode}
            onSelect={() => setSelected(mode)}
            onRun={() => runColumn(mode, festival)}
          />
        ))}
      </section>

      <div className="mt-4">
        <CompareCharts festival={festival} columns={columns} />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Showing plan:</span>
          {MODES.map(({ mode, title }) => (
            <button
              key={mode}
              onClick={() => setSelected(mode)}
              className={`rounded-full border px-3 py-1 ${selected === mode ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted hover:text-ink'}`}
            >
              {title}
            </button>
          ))}
        </div>
        <PlanDetail mode={selected} state={columns[selected]} />
      </div>

      <h2 className="mt-12 text-lg font-semibold">The memory behind it</h2>
      <section className="mt-3 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <TeachPanel festival={festival} onTaught={loadMemory} onReplan={() => runColumn('full', festival)} />
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
    <section className="mt-5">
      <div className="flex flex-wrap gap-2">
        {stock.map((s) => {
          const cover = s.onHand / s.normalDailyUse;
          const tone = cover < 3 ? 'text-chili' : cover < 6 ? 'text-saffron' : 'text-leaf';
          return (
            <div key={s.id} className="rounded-lg border border-line bg-white px-3 py-2">
              <div className="text-xs text-muted">{s.name}</div>
              <div className="text-sm font-medium">
                {s.onHand} {s.unit} <span className={`text-xs font-normal ${tone}`}>· {cover.toFixed(1)} days left</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

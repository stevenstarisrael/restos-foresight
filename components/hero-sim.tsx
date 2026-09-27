'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowDown, Brain, RotateCcw } from 'lucide-react';
import { LiveButton } from './live-button';

// An interactive replay of Diwali night 2024 at Spice Garden, shown as a
// restOS kitchen display. Memory OFF replays what happened; memory ON replays
// the same night with what Foresight remembers. The end-of-night totals are
// the real ones (55 desserts turned away, ₹9,500 lost); the ticket stream is
// an illustrative sample of that evening's orders.

const EASE = [0.22, 1, 0.36, 1] as const;
const START_MIN = 18 * 60; // 6:00 pm
const NIGHT_MIN = 240; // until 10:00 pm
const SUGAR_OUT_AT = 65; // 7:05 pm
const DURATION_MS = 11_000;
const TURNED_AWAY = 55;
const LOST = 9_500;

type Item = { name: string; qty: number; sugar?: boolean; kaju?: boolean };
const MENU: Item[] = [
  { name: 'Kheer', qty: 2, sugar: true },
  { name: 'Hyderabadi biryani', qty: 1 },
  { name: 'Gulab jamun', qty: 4, sugar: true },
  { name: 'Kaju katli box', qty: 1, kaju: true },
  { name: 'Double ka meetha', qty: 2, sugar: true },
  { name: 'Paneer tikka', qty: 1 },
  { name: 'Jalebi', qty: 3, sugar: true },
  { name: 'Qubani ka meetha', qty: 2, sugar: true },
  { name: 'Mutton biryani', qty: 2 },
];

type Ticket = Item & { id: number; t: number; table: string };
const TICKETS: Ticket[] = Array.from({ length: 40 }, (_, i) => ({
  ...MENU[i % MENU.length],
  id: i,
  t: 2 + i * 6,
  table: `T${((i * 7) % 24) + 1}`,
}));

type Status = { kind: 'served' | 'away' | 'offmenu'; memory?: string };

function statusOf(ticket: Ticket, memory: boolean): Status {
  if (ticket.kaju) {
    return memory ? { kind: 'served', memory: '40 asked last Diwali - now on the menu' } : { kind: 'offmenu' };
  }
  if (ticket.sugar && ticket.t >= SUGAR_OUT_AT) {
    return memory ? { kind: 'served', memory: 'Sugar ordered a week early - it ran out at 7:05 last year' } : { kind: 'away' };
  }
  return { kind: 'served' };
}

function clock(min: number) {
  const total = START_MIN + Math.floor(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`;
}

export function HeroSim() {
  const reduce = useReducedMotion();
  const [memory, setMemory] = useState(false);
  const [t, setT] = useState(0);
  const [runs, setRuns] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const frame = useRef<number | null>(null);
  // The night starts when the display is on screen (below the fold on phones).
  const panel = useRef<HTMLDivElement>(null);
  const inView = useInView(panel, { once: true, amount: 0.5 });

  const play = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    if (reduce) {
      setT(NIGHT_MIN);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION_MS);
      setT(p * NIGHT_MIN);
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    setT(0);
    frame.current = requestAnimationFrame(tick);
  }, [reduce]);

  useEffect(() => {
    if (!inView) return;
    play();
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [play, runs, memory, inView]);

  const done = t >= NIGHT_MIN;
  const out = !memory && t >= SUGAR_OUT_AT;
  const afterOut = Math.max(0, Math.min(1, (t - SUGAR_OUT_AT) / (NIGHT_MIN - SUGAR_OUT_AT)));
  const sugarKg = memory ? 22 - 14 * (t / NIGHT_MIN) : Math.max(0, 6 * (1 - t / SUGAR_OUT_AT));
  const sugarMax = 22;
  const visible = TICKETS.filter((k) => k.t <= t).slice(-5).reverse();

  function toggle() {
    setMemory((m) => !m);
    setFlipped(true);
  }

  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden">
      <div
        className={`pointer-events-none absolute left-1/2 top-[60%] h-[80vh] w-[100vw] -translate-x-1/2 rounded-full transition-colors duration-700 ${
          out ? 'bg-[radial-gradient(closest-side,rgba(185,28,28,0.22),transparent)]' : memory ? 'bg-[radial-gradient(closest-side,rgba(21,128,61,0.22),transparent)]' : 'bg-[radial-gradient(closest-side,rgba(217,119,6,0.22),transparent)]'
        }`}
        aria-hidden
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-12 pt-24 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:pt-20">
        {/* Story + control */}
        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={memory ? 'on' : 'off'}
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <p className={`text-sm uppercase tracking-[0.2em] ${memory ? 'text-emerald-400' : 'text-amber-400/90'}`}>
                {memory ? 'The same night · with Foresight' : 'Diwali 2024 · Spice Garden, Hyderabad'}
              </p>
              <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
                {memory ? (
                  <>
                    This time, <span className="italic text-emerald-400">it remembered.</span>
                  </>
                ) : (
                  <>
                    Last Diwali, the sugar ran out at <span className="italic text-amber-400">7:05 pm.</span>
                  </>
                )}
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-stone-300">
                {memory
                  ? 'Sugar ordered a week early. Kaju katli on the menu. Every dessert served - because it remembered last year.'
                  : '55 desserts turned away. ₹9,500 lost on the busiest night of the year. And nobody remembered why.'}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 hidden lg:block">
            <MemorySwitch on={memory} onToggle={toggle} nudge={done && !memory && !flipped} />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <LiveButton />
            <a href="#the-night" className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-100">
              <ArrowDown size={16} aria-hidden /> See what happened
            </a>
          </div>
        </div>

        {/* Kitchen display */}
        <div>
        <motion.div
          ref={panel}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
          className={`relative rounded-2xl border bg-stone-950/80 p-4 shadow-2xl backdrop-blur transition-[border-color,box-shadow] duration-500 sm:p-5 ${
            out ? 'border-red-600/70 shadow-[0_0_60px_-10px_rgba(220,38,38,0.6)]' : memory ? 'border-emerald-600/50' : 'border-stone-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span className={`h-2 w-2 rounded-full ${done ? 'bg-stone-600' : 'animate-pulse bg-red-500'}`} />
              Kitchen display · Spice Garden
            </div>
            <button
              onClick={() => setRuns((r) => r + 1)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-stone-400 hover:bg-stone-800 hover:text-stone-100"
            >
              <RotateCcw size={12} aria-hidden /> Replay
            </button>
          </div>

          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-5xl font-semibold tabular-nums tracking-tight text-stone-50 sm:text-6xl">
                {clock(t)}
                <span className="ml-1.5 text-xl font-normal text-stone-500">pm</span>
              </div>
              <div className="text-xs text-stone-500">1 Nov · Diwali, day 2</div>
            </div>
            <div className="w-40 sm:w-48">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-stone-400">Sugar</span>
                <span className={`font-mono tabular-nums ${out ? 'font-semibold text-red-400' : 'text-stone-200'}`}>
                  {out ? 'OUT' : `${sugarKg.toFixed(1)} kg`}
                </span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-stone-800">
                <div
                  className={`h-full rounded-full ${memory ? 'bg-emerald-500' : sugarKg < 2 ? 'bg-red-500' : 'bg-amber-400'}`}
                  style={{ width: `${(sugarKg / sugarMax) * 100}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-stone-500">{memory ? '45 kg ordered a week early' : '25 kg ordered (normal + 5)'}</div>
            </div>
          </div>

          <div className="relative mt-4 h-[292px] overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((k) => (
                <TicketRow key={`${memory}-${runs}-${k.id}`} ticket={k} status={statusOf(k, memory)} />
              ))}
            </AnimatePresence>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-stone-950 to-transparent" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-stone-800 pt-3">
            <Stat
              label="Desserts turned away"
              value={memory ? '0' : String(Math.round(TURNED_AWAY * afterOut))}
              tone={memory ? 'good' : afterOut > 0 ? 'bad' : undefined}
            />
            <Stat
              label={memory ? 'Won back vs last year' : 'Lost tonight'}
              value={`₹${Math.round(LOST * afterOut).toLocaleString('en-IN')}`}
              tone={memory ? 'good' : afterOut > 0 ? 'bad' : undefined}
            />
          </div>

          <AnimatePresence>
            {out && !done && t < SUGAR_OUT_AT + 55 && (
              <motion.div
                initial={{ opacity: 0, scale: 1.3, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: -8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border-4 border-red-500 bg-stone-950/70 px-4 py-1.5 font-mono text-2xl font-bold tracking-widest text-red-500 sm:px-5 sm:py-2 sm:text-3xl"
              >
                SUGAR OUT
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <div className="mt-5 lg:hidden">
          <MemorySwitch on={memory} onToggle={toggle} nudge={done && !memory && !flipped} />
        </div>
        </div>
      </div>
    </section>
  );
}

function MemorySwitch({ on, onToggle, nudge }: { on: boolean; onToggle: () => void; nudge: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={`relative inline-flex items-center gap-3 rounded-full border py-2 pl-2 pr-5 transition ${
          on ? 'border-emerald-500/60 bg-emerald-950/60' : 'border-stone-700 bg-stone-900'
        }`}
      >
        {nudge && <span className="absolute inset-0 animate-ping rounded-full border-2 border-amber-400/70" aria-hidden />}
        <span className={`relative h-8 w-14 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-stone-700'}`}>
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className={`absolute top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-stone-900 ${on ? 'right-1' : 'left-1'}`}
          >
            <Brain size={14} aria-hidden />
          </motion.span>
        </span>
        <span className="text-left">
          <span className="block text-sm font-medium text-stone-100">Hindsight memory</span>
          <span className={`block text-xs ${on ? 'text-emerald-400' : 'text-stone-400'}`}>{on ? 'On - replaying with Foresight' : 'Off - how it really went'}</span>
        </span>
      </button>
      <AnimatePresence>
        {nudge && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-amber-300"
          >
            <span className="lg:hidden">↑</span>
            <span className="hidden lg:inline">←</span> Flip it. Replay the same night with memory.
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function TicketRow({ ticket, status }: { ticket: Ticket; status: Status }) {
  const chip =
    status.kind === 'served'
      ? { text: 'Served', cls: 'bg-emerald-950 text-emerald-300' }
      : status.kind === 'away'
        ? { text: 'Turned away', cls: 'bg-red-950 text-red-300' }
        : { text: 'Not on menu', cls: 'bg-stone-800 text-stone-400' };
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className={`mb-2 rounded-xl border px-3 py-2.5 ${status.kind === 'away' ? 'border-red-900/70 bg-red-950/30' : 'border-stone-800 bg-stone-900/80'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="rounded-md bg-stone-800 px-1.5 py-0.5 font-mono text-[11px] text-stone-300">{ticket.table}</span>
          <span className={`truncate text-sm ${status.kind === 'away' ? 'text-stone-400 line-through' : 'text-stone-100'}`}>
            {ticket.name} <span className="text-stone-500">×{ticket.qty}</span>
          </span>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.cls}`}>{chip.text}</span>
      </div>
      {status.memory && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400/90">
          <Brain size={12} aria-hidden /> {status.memory}
        </div>
      )}
    </motion.div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div>
      <div className={`font-display text-3xl tabular-nums ${tone === 'bad' ? 'text-red-400' : tone === 'good' ? 'text-emerald-400' : 'text-stone-100'}`}>{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  );
}

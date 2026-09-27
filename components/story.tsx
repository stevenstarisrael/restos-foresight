'use client';

import { HeroSim } from './hero-sim';
import { LiveButton } from './live-button';
import { useEffect, useRef, useState } from 'react';
import {
  animate,
  MotionConfig,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { ArrowUpRight, Brain, CalendarRange, MessageSquareOff, RotateCcw, Search, Sparkles, UserX } from 'lucide-react';
import type { PlanResult } from '@/lib/plan';

type Mode = PlanResult['mode'];

export type StoryData = {
  daysToDiwali: number;
  memory: { events: number; festivals: number; since: string };
  curve: { mode: Mode; readiness: number; short: string[]; spend: number }[];
  sampleOrder: { item: string; quantity: number; unit: string; orderBy: string; lastTime: string; why: string } | null;
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function Story({ data }: { data: StoryData }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="bg-[#0c0a09] text-stone-100">
        <Nav />
        <HeroSim />
        <TheNight />
        <WhyMissed />
        <HowItWorks sample={data.sampleOrder} />
        <LearningCurve curve={data.curve} />
        <FinalCta days={data.daysToDiwali} />
        <Footer memory={data.memory} />
      </div>
    </MotionConfig>
  );
}

// ── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-saffron text-xs font-bold text-white">F</span>
          <span className="text-sm font-medium">restOS Foresight</span>
        </div>
        <LiveButton size="sm" />
      </div>
    </header>
  );
}

// ── 2. The night it happened (scroll-driven) ────────────────────────────────

const NIGHT = [
  { when: '25 Oct', time: '12:00', text: 'Imran orders 25 kg of sugar for Diwali week - a normal week plus 5 kg.', tag: 'The plan', sugar: 25 },
  { when: '29 Oct', time: '16:00', text: 'Balaji Traders delivers two days late. Begum Bazar is overloaded before Diwali.', tag: 'Supplier', sugar: 25 },
  { when: '31 Oct', time: '21:00', text: '40 customers ask for kaju katli. It isn’t on the menu, so the POS never hears about it.', tag: 'Unseen demand', sugar: 13 },
  { when: '1 Nov', time: '15:30', text: 'Sweet boxes run out. 12 takeaway orders refused.', tag: 'Stock-out', sugar: 6 },
  { when: '1 Nov', time: '19:05', text: 'Sugar hits zero. Kheer, gulab jamun and double ka meetha come off the menu.', tag: 'Stock-out', sugar: 0 },
  { when: '4 Nov', time: '11:00', text: '8 kg of paneer expires. We stocked for a rush that went to sweets instead.', tag: 'Waste', sugar: 0 },
];

function TheNight() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setActive(Math.min(NIGHT.length - 1, Math.floor(v * NIGHT.length))));

  // Numbers settle on each step's real values, so the counters always match
  // the line being read.
  const sugar = useMotionValue(NIGHT[0].sugar);
  const turnedAway = useMotionValue(0);
  const lost = useMotionValue(0);
  useEffect(() => {
    const after = NIGHT[active].sugar === 0;
    const opts = { duration: 0.8, ease: EASE };
    const c = [animate(sugar, NIGHT[active].sugar, opts), animate(turnedAway, after ? 55 : 0, opts), animate(lost, after ? 9500 : 0, opts)];
    return () => c.forEach((x) => x.stop());
  }, [active, sugar, turnedAway, lost]);
  const fill = useTransform(sugar, (kg) => `${(kg / 25) * 100}%`);
  const fillColor = useTransform(sugar, [0, 6, 13, 25], ['#b91c1c', '#dc2626', '#f59e0b', '#fbbf24']);

  return (
    <section id="the-night" ref={ref} className="relative h-[420vh]">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-5 px-4 pt-14 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:gap-10 md:pt-0">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-stone-500">The night it happened</p>
            <h2 className="mt-2 font-display text-3xl leading-tight sm:text-5xl md:mt-3">Everyone was busy. Nobody saw it coming.</h2>

            <div className="mt-4 flex items-end gap-6 md:mt-8">
              <div className="relative hidden h-64 w-28 overflow-hidden rounded-b-3xl rounded-t-lg border-2 border-stone-700 bg-stone-900 md:block" aria-hidden>
                <motion.div className="absolute inset-x-0 bottom-0" style={{ height: fill, background: fillColor }} />
                <div className="absolute inset-x-0 top-2 text-center text-[11px] uppercase tracking-wide text-stone-400">Sugar</div>
              </div>
              <div className="grid w-full grid-cols-3 gap-3 md:block md:w-auto md:space-y-4">
                <div className="col-span-3 md:hidden">
                  <div className="text-[11px] uppercase tracking-wide text-stone-400">Sugar</div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-stone-800">
                    <motion.div className="h-full rounded-full" style={{ width: fill, background: fillColor }} />
                  </div>
                </div>
                <Counter label="kg of sugar left" value={sugar} />
                <Counter label="orders turned away" value={turnedAway} tone="red" />
                <Counter label="lost that night" value={lost} prefix="₹" tone="red" />
              </div>
            </div>
          </div>

          <ol className="relative space-y-2 border-l border-stone-800 pl-6 md:space-y-3">
            {NIGHT.map((n, i) => {
              const state = i < active ? 'past' : i === active ? 'now' : 'future';
              return (
                <motion.li
                  key={i}
                  animate={{ opacity: state === 'future' ? 0.18 : state === 'past' ? 0.5 : 1, x: state === 'now' ? 6 : 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="relative"
                >
                  <span
                    className={`absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 ${
                      state === 'now' ? 'border-amber-400 bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.8)]' : 'border-stone-600 bg-[#0c0a09]'
                    }`}
                  />
                  <div className="flex items-baseline gap-2 text-xs text-stone-400">
                    <span className="font-medium text-stone-200">{n.when}</span>
                    <span>{n.time}</span>
                    <span className={`rounded-full px-2 py-0.5 ${n.tag === 'Stock-out' || n.tag === 'Waste' ? 'bg-red-950 text-red-300' : 'bg-stone-800 text-stone-300'}`}>{n.tag}</span>
                  </div>
                  <p className={`mt-1 leading-snug ${state === 'now' ? 'text-base text-stone-50 sm:text-xl' : 'line-clamp-1 text-sm text-stone-300 md:line-clamp-none md:text-base'}`}>{n.text}</p>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Counter({ label, value, prefix = '', tone }: { label: string; value: MotionValue<number>; prefix?: string; tone?: 'red' }) {
  const text = useTransform(value, (v) => `${prefix}${Math.round(v).toLocaleString('en-IN')}`);
  return (
    <div>
      <motion.div className={`font-display text-3xl tabular-nums md:text-4xl ${tone === 'red' ? 'text-red-400' : 'text-stone-50'}`}>{text}</motion.div>
      <div className="text-xs text-stone-400">{label}</div>
    </div>
  );
}

// ── 3. Why nothing caught it ────────────────────────────────────────────────

function WhyMissed() {
  return (
    <section id="why" className="scroll-mt-16 bg-paper py-24 text-ink sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-sm uppercase tracking-[0.2em] text-muted">Why software never caught it</p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
            The data that would have saved Diwali was never in the system.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Reveal delay={0.05}>
            <WhyCard icon={<MessageSquareOff size={20} />} title="Sales only record what sold">
              The 40 people who asked for kaju katli, the 55 desserts turned away - none of it reaches the POS. Lost demand is invisible.
            </WhyCard>
          </Reveal>
          <Reveal delay={0.15}>
            <WhyCard icon={<CalendarRange size={20} />} title="Festivals move every year">
              <MovingDiwali />
            </WhyCard>
          </Reveal>
          <Reveal delay={0.25}>
            <WhyCard icon={<UserX size={20} />} title="Lessons live in people’s heads">
              Imran knows Balaji is late before Diwali. Ravi knows ghee runs out. When they’re off, or leave, so does the knowledge.
            </WhyCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function WhyCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="h-full rounded-2xl border border-line bg-white p-6">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-saffron-soft text-amber-800">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}

// Diwali's date on an Oct 15 – Nov 10 strip, sliding year to year.
function MovingDiwali() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const span = 26; // days from 15 Oct to 10 Nov
  const years = [
    { year: '2024', day: 16, label: '31 Oct' },
    { year: '2025', day: 5, label: '20 Oct' },
    { year: '2026', day: 24, label: '8 Nov' },
  ];
  return (
    <div ref={ref}>
      <p>“Same week last year” lands on the wrong days. Diwali alone has moved 11 days back, then 19 forward.</p>
      <div className="mt-4 space-y-2">
        {years.map((y, i) => (
          <div key={y.year} className="flex items-center gap-2">
            <span className="w-9 text-xs tabular-nums text-ink">{y.year}</span>
            <div className="relative h-5 flex-1 rounded-full bg-stone-100">
              <motion.div
                className="absolute top-0.5 h-4 rounded-full bg-saffron px-1.5 text-[10px] font-medium leading-4 text-white"
                initial={{ left: '0%', opacity: 0 }}
                animate={inView ? { left: `${(y.day / span) * 78}%`, opacity: 1 } : {}}
                transition={{ duration: 0.9, delay: 0.2 + i * 0.25, ease: EASE }}
              >
                {y.label}
              </motion.div>
            </div>
          </div>
        ))}
        <div className="flex justify-between pl-11 text-[10px] text-muted">
          <span>15 Oct</span>
          <span>10 Nov</span>
        </div>
      </div>
    </div>
  );
}

// ── 4. How it works ─────────────────────────────────────────────────────────

const RETAINED = ['Sugar out 7:05pm · Diwali 2024', 'Balaji 2 days late', '40 asked for kaju katli', '8 kg paneer wasted', 'Plan vs outcome · 2025'];
const SEARCHES = ['Meaning', 'Keywords', 'Connections', 'Time - “last Diwali”'];

function HowItWorks({ sample }: { sample: StoryData['sampleOrder'] }) {
  return (
    <section id="how" className="scroll-mt-16 bg-paper pb-24 text-ink sm:pb-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-sm uppercase tracking-[0.2em] text-muted">How Foresight remembers</p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
            Every stock-out, delay and missed order becomes memory. Every festival, it plans from it.
          </h2>
          <p className="mt-4 max-w-2xl text-muted">
            Built on <span className="font-medium text-ink">Hindsight</span>, an agent memory layer that stores what happened with its real date,
            connects it, and reasons over it.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <Reveal delay={0.05}>
            <Step n={1} icon={<Brain size={18} />} title="Retain" text="restOS events and staff notes go into the outlet’s memory as they happen.">
              <div className="space-y-1.5">
                {RETAINED.map((r, i) => (
                  <motion.div
                    key={r}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.12, duration: 0.5, ease: EASE }}
                    className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs"
                  >
                    {r}
                  </motion.div>
                ))}
              </div>
            </Step>
          </Reveal>
          <Reveal delay={0.15}>
            <Step n={2} icon={<Search size={18} />} title="Recall" text="Before each festival it searches memory four ways at once.">
              <div className="space-y-2.5">
                {SEARCHES.map((s, i) => (
                  <div key={s}>
                    <div className="text-xs">{s}</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                      {/* A sweep, not a score: all four searches run in parallel. */}
                      <motion.div
                        className="h-full w-1/3 rounded-full bg-leaf"
                        initial={{ x: '-100%' }}
                        whileInView={{ x: ['-100%', '300%'] }}
                        viewport={{ once: false }}
                        transition={{ delay: i * 0.12, duration: 1.6, repeat: Infinity, repeatDelay: 0.6, ease: 'easeInOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Step>
          </Reveal>
          <Reveal delay={0.25}>
            <Step n={3} icon={<Sparkles size={18} />} title="Reflect" text="It reasons over what it found and writes a plan, citing the past.">
              {sample ? (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 0.6, ease: EASE }}
                  className="rounded-xl border border-line bg-white p-3 shadow-sm"
                >
                  <div className="text-xs text-muted">Diwali 2026 · order by {shortDate(sample.orderBy)}</div>
                  <div className="mt-0.5 text-xl font-semibold">
                    {sample.quantity} {sample.unit} {sample.item}
                  </div>
                  {sample.lastTime && (
                    <div className="mt-2 rounded-lg bg-leaf-soft/70 p-2 text-xs text-leaf">
                      <b>Last time:</b> {sample.lastTime}
                    </div>
                  )}
                </motion.div>
              ) : (
                <p className="text-xs text-muted">Run the live demo to see a plan.</p>
              )}
            </Step>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Step({ n, icon, title, text, children }: { n: number; icon: React.ReactNode; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-white p-6">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-white">{icon}</span>
        <span className="text-xs text-muted">Step {n}</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{text}</p>
      <div className="mt-5 flex-1">{children}</div>
    </div>
  );
}

// ── 5. Learning curve ───────────────────────────────────────────────────────

const CURVE_META: Record<Mode, { title: string; sub: string; color: string }> = {
  none: { title: 'No memory', sub: 'A plain AI with today’s stock', color: '#7cc190' },
  firstSeason: { title: 'After 1 season', sub: 'Remembers Diwali 2024', color: '#2b9a50' },
  full: { title: 'After 2 years', sub: 'Remembers every festival', color: '#0f5f32' },
};

function LearningCurve({ curve }: { curve: StoryData['curve'] }) {
  const none = curve.find((c) => c.mode === 'none');
  return (
    <section id="learn" className="scroll-mt-16 bg-white py-24 text-ink sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-sm uppercase tracking-[0.2em] text-muted">Watch it learn · Diwali 2026</p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
            Same AI. Same stock. <span className="italic text-leaf">Only the memory changed.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-muted">
            How much of this Diwali’s likely need each plan covers - last Diwali’s actual use plus last year’s growth, from restOS records.
          </p>
        </Reveal>

        {curve.length ? (
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {curve.map((c, i) => (
              <Reveal key={c.mode} delay={i * 0.12}>
                <CurveCard {...c} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="mt-10 text-muted">Open the live demo to generate the three plans.</p>
        )}

        {none && none.short.length > 0 && (
          <Reveal delay={0.2}>
            <p className="mt-8 max-w-3xl text-lg leading-relaxed">
              Without memory, the plan spends <b>₹{Math.round(none.spend / 1000)}k</b> and still runs short on{' '}
              <b>{none.short.join(', ').toLowerCase()}</b>. It buys the wrong things - because it doesn’t know what happened last time.
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}

function CurveCard({ mode, readiness, short }: StoryData['curve'][number]) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const meta = CURVE_META[mode];
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div ref={ref} className="flex h-full flex-col items-center rounded-2xl border border-line p-6 text-center">
      <svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label={`${meta.title}: ${readiness}% ready`}>
        <circle cx="85" cy="85" r={r} fill="none" stroke="#e7e5e4" strokeWidth="12" />
        <motion.circle
          cx="85"
          cy="85"
          r={r}
          fill="none"
          stroke={meta.color}
          strokeWidth="12"
          strokeLinecap="round"
          transform="rotate(-90 85 85)"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={inView ? { strokeDashoffset: c * (1 - readiness / 100) } : {}}
          transition={{ duration: 1.4, delay: 0.2, ease: EASE }}
        />
        <text x="85" y="84" textAnchor="middle" dominantBaseline="middle" className="fill-ink font-display text-[40px]">
          {inView ? <CountUp to={readiness} /> : '0'}%
        </text>
        <text x="85" y="114" textAnchor="middle" className="fill-muted text-[11px]">
          ready
        </text>
      </svg>
      <div className="mt-3 flex items-center gap-2 font-semibold">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
        {meta.title}
      </div>
      <div className="text-sm text-muted">{meta.sub}</div>
      <div className={`mt-3 text-sm ${short.length ? 'text-chili' : 'text-leaf'}`}>
        {short.length ? `Runs short on ${short.length} item${short.length === 1 ? '' : 's'}` : 'Nothing runs out'}
      </div>
    </div>
  );
}

function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const controls = animate(0, to, { duration: 1.4, delay: 0.2, ease: EASE, onUpdate: (v) => setN(Math.round(v)) });
    return () => controls.stop();
  }, [to]);
  return <>{n}</>;
}

// ── 6. Final CTA ────────────────────────────────────────────────────────────

function FinalCta({ days }: { days: number }) {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(217,119,6,0.25),transparent)]" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <Reveal>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-400/90">Hindsight gives your kitchen foresight</p>
          <h2 className="mt-4 font-display text-5xl leading-tight sm:text-7xl">
            Diwali 2026 is <span className="italic text-amber-400">{days} days</span> away.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-stone-300">
            See the plan it writes today, how it compares with no memory, and teach it something new.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <LiveButton />
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-100"
            >
              <RotateCcw size={15} aria-hidden /> Replay the story
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function shortDate(iso: string) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? iso : new Date(t).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ── Footer ──────────────────────────────────────────────────────────────────

const LINKS: { title: string; items: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: 'The story',
    items: [
      { label: 'The night it happened', href: '#the-night' },
      { label: 'Why it was missed', href: '#why' },
      { label: 'How it remembers', href: '#how' },
      { label: 'Watch it learn', href: '#learn' },
    ],
  },
  {
    title: 'Try it',
    items: [
      { label: 'Live dashboard', href: '/live' },
      { label: 'Plan Diwali 2026', href: '/live?run=1' },
      { label: 'Plan Dussehra 2026', href: '/live?run=1&festival=dussehra' },
    ],
  },
  {
    title: 'Built with',
    items: [
      { label: 'Hindsight on GitHub', href: 'https://github.com/vectorize-io/hindsight', external: true },
      { label: 'Hindsight docs', href: 'https://hindsight.vectorize.io/', external: true },
      { label: 'What is agent memory?', href: 'https://vectorize.io/what-is-agent-memory', external: true },
      { label: 'Groq', href: 'https://groq.com/', external: true },
    ],
  },
];

function Footer({ memory }: { memory: StoryData['memory'] }) {
  return (
    <footer className="relative overflow-hidden border-t border-stone-800/80">
      <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-saffron text-sm font-bold text-white">F</span>
              <span className="font-medium">restOS Foresight</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone-400">
              Festival demand memory for restaurants. It remembers what ran out, what was wasted and what customers asked for, so the next festival goes better.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-900/70 bg-emerald-950/40 px-3 py-1.5 text-xs text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Remembering {memory.events} events across {memory.festivals} festivals since {memory.since}
            </div>
            <div className="mt-6">
              <LiveButton size="sm" />
            </div>
          </div>

          {LINKS.map((group) => (
            <nav key={group.title} aria-label={group.title} className={group.title === 'Built with' ? 'col-span-2 md:col-span-1' : ''}>
              <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">{group.title}</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {group.items.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      {...(l.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                      className="group inline-flex items-center gap-1 text-stone-300 transition hover:text-white"
                    >
                      {l.label}
                      {l.external && <ArrowUpRight size={13} className="text-stone-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" aria-hidden />}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-stone-800/80 py-6 text-xs text-stone-500 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl">
            Spice Garden · Banjara Hills is a demo outlet. Its history is synthetic, and every number on this page is consistent with it.
          </p>
          <div className="flex items-center gap-4">
            <span>Made in Hyderabad</span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-1 text-stone-400 hover:text-white"
            >
              <RotateCcw size={12} aria-hidden /> Back to 7:05 pm
            </button>
          </div>
        </div>
      </div>

      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: EASE }}
        className="pointer-events-none -mb-[3vw] select-none px-2 text-center font-display text-[22vw] leading-[0.9] tracking-tight md:text-[18vw]"
        style={{
          backgroundImage: 'linear-gradient(to bottom, rgba(217,119,6,0.45), rgba(217,119,6,0.02) 85%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        Foresight
      </motion.div>
    </footer>
  );
}

// ── Shared ──────────────────────────────────────────────────────────────────

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

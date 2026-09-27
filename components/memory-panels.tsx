'use client';

import { useState } from 'react';
import { BrainCircuit, Lightbulb, Loader2, PenLine, RefreshCw, WandSparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { history } from '@/data/history';

export type Belief = { id: string; text: string; proofCount: number };
export type MemoryState = { counts?: Record<string, number>; beliefs: Belief[]; error?: string };
export type PlaybookState = { content?: string; refreshedAt?: string | null; error?: string };

const SUGGESTIONS = [
  { kind: 'lost_demand', text: 'This week about 20 regulars asked if we will have sugar-free or jaggery sweets for Diwali — diabetic parents at home.' },
  { kind: 'supplier', text: 'Sri Lakshmi Dairy says ghee will be ₹680/kg from 15 Oct and they need 5 days notice for bulk orders above 10 kg this Diwali.' },
  { kind: 'staff_note', text: 'Two corporate clients (Hitec City) already called asking to book Diwali kaju katli boxes — around 150 boxes together.' },
];

export function TeachPanel({ festival, onTaught, onReplan }: { festival: string; onTaught: () => void; onReplan: () => void }) {
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
      setStatus({ tone: 'ok', msg: 'Retained. Press “Re-plan with full memory” to see it change the plan.' });
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
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-left text-xs text-muted hover:border-saffron hover:text-ink"
          >
            <Lightbulb size={13} className="shrink-0" aria-hidden />
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
          className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          {status?.tone === 'busy' ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <BrainCircuit size={15} aria-hidden />}
          Remember this
        </button>
        <button onClick={onReplan} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-stone-50">
          <WandSparkles size={15} aria-hidden />
          Re-plan with full memory
        </button>
      </div>
      {status && (
        <p className={`mt-2 text-xs ${status.tone === 'err' ? 'text-chili' : status.tone === 'ok' ? 'text-leaf' : 'text-muted'}`}>{status.msg}</p>
      )}
    </div>
  );
}

export function BeliefsPanel({ memory, onReload }: { memory: MemoryState; onReload: () => void }) {
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
        <button onClick={onReload} className="inline-flex items-center gap-1 text-xs text-muted underline underline-offset-2">
          <RefreshCw size={12} aria-hidden />
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

export function PlaybookPanel({
  playbook,
  onReload,
}: {
  playbook: PlaybookState;
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
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-3 py-1 text-xs hover:bg-stone-50 disabled:opacity-50"
        >
          {refreshing ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <PenLine size={13} aria-hidden />}
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

export function TimelinePanel() {
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

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

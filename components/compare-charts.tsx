'use client';

import { useState } from 'react';
import { ChartBar, Table2 } from 'lucide-react';
import { lastFestivalActuals, stock } from '@/data/outlet';
import { ITEM_ICON, rupees } from '@/lib/insights';
import type { Plan } from '@/lib/plan';
import { MODE_COLOR, MODES, type ColumnState, type Mode } from './plan-view';

// need = last year's actual use scaled by last year's growth trend.
type Row = { stockId: string; name: string; unit: string; actual: number; need: number; available: Partial<Record<Mode, number>> };

// "Available" = what is on the shelf after the plan's orders arrive, which is
// the number that decides whether we run out.
function availableFor(plan: Plan, stockId: string): number {
  const onHand = stock.find((s) => s.id === stockId)?.onHand ?? 0;
  return onHand + plan.orders.filter((o) => o.stockId === stockId).reduce((sum, o) => sum + o.quantity, 0);
}

function buildRows(festival: string, columns: Record<Mode, ColumnState>): Row[] {
  const ref = lastFestivalActuals[festival];
  if (!ref) return [];
  return Object.entries(ref.items).map(([stockId, actual]) => {
    const item = stock.find((s) => s.id === stockId)!;
    const available: Row['available'] = {};
    for (const { mode } of MODES) {
      const plan = columns[mode].result?.plan;
      if (plan) available[mode] = availableFor(plan, stockId);
    }
    return { stockId, name: item.name, unit: item.unit, actual, need: Math.round(actual * (1 + ref.growth)), available };
  });
}

type Score = { readiness: number; short: string[]; wasteRisk: number };

// Readiness: share of this year's likely need each plan covers (each item
// capped at 100%). Waste risk: money tied up in stock beyond 125% of that
// need, which is what tends to expire or sit unsold.
function score(rows: Row[], mode: Mode): Score | null {
  const scored = rows.filter((r) => r.available[mode] !== undefined);
  if (!scored.length) return null;
  let total = 0;
  let wasteRisk = 0;
  const short: string[] = [];
  for (const r of scored) {
    const available = r.available[mode]!;
    total += Math.min(1, available / r.need);
    if (available < r.need) short.push(r.name);
    const cost = stock.find((s) => s.id === r.stockId)!.costPerUnit;
    wasteRisk += Math.max(0, available - r.need * 1.25) * cost;
  }
  return { readiness: Math.round((total / scored.length) * 100), short, wasteRisk: Math.round(wasteRisk) };
}

export function CompareCharts({ festival, columns }: { festival: string; columns: Record<Mode, ColumnState> }) {
  const [asTable, setAsTable] = useState(false);
  const ref = lastFestivalActuals[festival];
  const rows = buildRows(festival, columns);
  const planned = MODES.filter((m) => columns[m.mode].result);
  if (!ref || planned.length === 0) return null;

  return (
    <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Would each plan have been enough?</h2>
          <p className="mt-0.5 text-xs text-muted">
            Likely need = what we actually used at {ref.label}
            {ref.growth > 0 ? ` + ${Math.round(ref.growth * 100)}% growth (last year's festival revenue trend)` : ''}, from restOS records.
          </p>
        </div>
        <button onClick={() => setAsTable((v) => !v)} className="inline-flex items-center gap-1 text-xs text-muted underline underline-offset-2">
          {asTable ? <ChartBar size={13} aria-hidden /> : <Table2 size={13} aria-hidden />}
          {asTable ? 'Show as chart' : 'Show as table'}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {MODES.map(({ mode, title }) => {
          const s = score(rows, mode);
          return <ReadinessRing key={mode} title={title} color={MODE_COLOR[mode]} score={s} />;
        })}
      </div>

      <Legend actualLabel="Likely need this year" />

      {asTable ? <CompareTable rows={rows} /> : (
        <div className="mt-2 space-y-5">
          {rows.map((r) => (
            <ItemBars key={r.stockId} row={r} />
          ))}
        </div>
      )}
    </section>
  );
}

function ReadinessRing({ title, color, score: s }: { title: string; color: string; score: Score | null }) {
  const size = 104;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = s?.readiness ?? 0;
  const verdict = !s ? null : pct >= 100 ? 'Fully covered' : pct >= 80 ? 'Mostly covered' : 'Will run short';
  const icon = !s ? '' : pct >= 100 ? '✅' : pct >= 80 ? '⚠️' : '❌';

  return (
    <div className="flex items-center gap-4 rounded-xl bg-paper p-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${title}: ${s ? `${pct}% ready` : 'not planned'}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e7e5e4" strokeWidth={stroke} />
        {s && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(Math.max(pct, 1) / 100) * circumference} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dasharray 700ms ease' }}
          />
        )}
        <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-ink text-xl font-semibold">
          {s ? `${pct}%` : '—'}
        </text>
        <text x="50%" y="66%" textAnchor="middle" dominantBaseline="middle" className="fill-muted text-[10px]">
          ready
        </text>
      </svg>
      <div className="min-w-0 text-xs">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          {title}
        </div>
        {s ? (
          <>
            <div className="mt-1 font-medium">
              {icon} {verdict}
            </div>
            {s.short.length > 0 && <div className="mt-0.5 text-muted">Short on: {s.short.join(', ')}</div>}
            <div className="mt-0.5 text-muted">
              Over-stock at risk: <b className="text-ink">{s.wasteRisk ? rupees(s.wasteRisk) : 'none'}</b>
            </div>
          </>
        ) : (
          <div className="mt-1 text-muted">Not planned yet</div>
        )}
      </div>
    </div>
  );
}

function Legend({ actualLabel }: { actualLabel: string }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span className="font-medium text-ink">Stock after ordering:</span>
      {MODES.map(({ mode, title }) => (
        <span key={mode} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: MODE_COLOR[mode] }} />
          {title}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3.5 w-0.5 bg-ink" />
        {actualLabel}
      </span>
    </div>
  );
}

function ItemBars({ row }: { row: Row }) {
  const [hover, setHover] = useState<Mode | null>(null);
  const values = Object.values(row.available).filter((v): v is number => v !== undefined);
  const scale = Math.max(row.need, ...values) * 1.1;
  const pct = (n: number) => `${(n / scale) * 100}%`;
  const onHand = stock.find((s) => s.id === row.stockId)?.onHand ?? 0;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-medium">
          {ITEM_ICON[row.stockId]} {row.name}
        </span>
        <span className="text-xs text-muted">
          {hover && row.available[hover] !== undefined
            ? `${MODES.find((m) => m.mode === hover)!.title}: ${onHand} in stock + ${row.available[hover]! - onHand} ordered = ${row.available[hover]} ${row.unit}`
            : row.need === row.actual ? `needed last year: ${row.actual} ${row.unit}` : `likely need ~${row.need} ${row.unit} (used ${row.actual} last year)`}
        </span>
      </div>
      <div className="relative space-y-[2px]">
        {MODES.map(({ mode }) => {
          const v = row.available[mode];
          return (
            <div
              key={mode}
              className="group relative flex h-4 items-center"
              onMouseEnter={() => setHover(mode)}
              onMouseLeave={() => setHover(null)}
            >
              {v !== undefined ? (
                <>
                  <div
                    className="h-2.5 rounded-r-[4px] transition-[width] duration-700"
                    style={{ width: pct(v), background: MODE_COLOR[mode], opacity: hover && hover !== mode ? 0.35 : 1 }}
                  />
                  <span className={`ml-1.5 text-[11px] tabular-nums ${v < row.need ? 'font-semibold text-chili' : 'text-muted'}`}>
                    {v}
                    {v < row.need ? ' ✕ short' : ''}
                  </span>
                </>
              ) : (
                <span className="text-[11px] text-muted">not planned</span>
              )}
            </div>
          );
        })}
        <div className="pointer-events-none absolute -top-1 -bottom-1 w-0.5 bg-ink" style={{ left: pct(row.need) }} />
      </div>
    </div>
  );
}

function CompareTable({ rows }: { rows: Row[] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-b border-line">
            <th className="py-2 pr-3 font-medium">Item</th>
            <th className="py-2 pr-3 font-medium">Used last year</th>
            <th className="py-2 pr-3 font-medium">Likely need</th>
            {MODES.map((m) => (
              <th key={m.mode} className="py-2 pr-3 font-medium">
                {m.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.stockId} className="border-b border-line last:border-0">
              <td className="py-2 pr-3">{r.name}</td>
              <td className="py-2 pr-3 tabular-nums">
                {r.actual} {r.unit}
              </td>
              <td className="py-2 pr-3 tabular-nums">
                {r.need} {r.unit}
              </td>
              {MODES.map(({ mode }) => {
                const v = r.available[mode];
                return (
                  <td key={mode} className={`py-2 pr-3 tabular-nums ${v !== undefined && v < r.need ? 'font-semibold text-chili' : ''}`}>
                    {v === undefined ? '—' : `${v} ${r.unit}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

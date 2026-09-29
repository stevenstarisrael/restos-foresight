'use client';

import { useState } from 'react';
import { ChartBar, Table2 } from 'lucide-react';
import { lastFestivalActuals, stock } from '@/data/outlet';
import { buildRows, score, STAFF_ROW_ID, type Row, type Score } from '@/lib/readiness';
import { ITEM_ICON, rupees } from '@/lib/insights';
import { MODE_COLOR, MODES, type ColumnState, type Mode } from './plan-view';

export function CompareCharts({ festival, columns }: { festival: string; columns: Record<Mode, ColumnState> }) {
  const [asTable, setAsTable] = useState(false);
  const ref = lastFestivalActuals[festival];
  const plans = Object.fromEntries(MODES.flatMap(({ mode }) => (columns[mode].result ? [[mode, columns[mode].result!.plan]] : [])));
  const rows = buildRows(festival, plans);
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
            {ref.preBookDays &&
              ` Orders count only if placed ${Object.entries(
                Object.entries(ref.preBookDays).reduce<Record<number, string[]>>((acc, [id, d]) => ({ ...acc, [d]: [...(acc[d] ?? []), id] }), {}),
              )
                .map(([d, ids]) => `${d}+ days ahead for ${ids.join(', ')}`)
                .join('; ')}, as the records require.`}
            {ref.staff && ` ${ref.staff.label} counts too: ${ref.staff.needed} ${ref.staff.unit} needed (${ref.staff.source}).`}
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
      <svg className="shrink-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${title}: ${s ? `${pct}% ready` : 'not planned'}`}>
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
            {s.short.length > 0 && (
              <div className="mt-0.5 text-muted">
                Short on: {s.short.map((n) => (s.tooLate.includes(n) ? `${n} (ordered too late)` : n)).join(', ')}
              </div>
            )}
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
      <span className="font-medium text-ink">After the plan:</span>
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
          {hover && row.available[hover] !== undefined && row.stockId === STAFF_ROW_ID
            ? `${MODES.find((m) => m.mode === hover)!.title}: ${row.available[hover]} ${row.unit} (${row.need} needed)`
            : hover && row.available[hover] !== undefined
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
                    {row.late[mode] ? ` · ${row.late[mode]} ordered too late to arrive` : ''}
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

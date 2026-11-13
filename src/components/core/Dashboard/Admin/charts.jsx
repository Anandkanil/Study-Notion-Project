import React, { useLayoutEffect, useState } from "react";

/*
 * Small hand-rolled charts for the admin dashboard, following the house chart rules:
 * one series per chart (no legend box: the title names it), thin columns (<= 24px)
 * with a 4px rounded data end and a square baseline, hairline solid gridlines,
 * clean round ticks, a hover tooltip per column, a direct label on the peak only,
 * and a table view for every chart. Mark colour is --chart-1, stepped per theme to
 * pass the lightness band and 3:1 contrast against the surface.
 */

// Callback ref: re-measures whenever the chart element mounts again (e.g. after "Show chart")
function useWidth() {
  const [el, setEl] = useState(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, width];
}

/** Round axis maximum and step: 0, 1,000, 2,000 … */
function niceScale(max, ticks = 4) {
  if (max <= 0) return { top: ticks, step: 1 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  return { top: step * ticks, step };
}

/** Column with a 4px rounded top and a square baseline. */
const columnPath = (x, y, w, h) => {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
};

export function ColumnChart({ title, subtitle, data, format, tickFormat = format, emptyText }) {
  const [wrapRef, width] = useWidth();
  const [hover, setHover] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const total = data.reduce((n, d) => n + d.value, 0);

  const H = 220;
  const pad = { top: 22, right: 8, bottom: 28, left: 52 };
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = H - pad.top - pad.bottom;
  const max = Math.max(0, ...data.map((d) => d.value));
  const { top, step } = niceScale(max);
  const band = data.length ? plotW / data.length : 0;
  const colW = Math.min(24, band * 0.6);
  const y = (v) => pad.top + plotH - (v / top) * plotH;
  const peak = max > 0 ? data.findIndex((d) => d.value === max) : -1;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  // Thin out month labels when columns are narrow
  const every = band < 34 ? 2 : 1;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-medium text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        <button type="button" onClick={() => setShowTable((v) => !v)} className="text-sm font-semibold text-accent-text underline-offset-4 hover:underline" aria-pressed={showTable}>
          {showTable ? "Show chart" : "Show as table"}
        </button>
      </div>

      {showTable ? (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th scope="col" className="py-2 font-semibold">Month</th>
              <th scope="col" className="py-2 text-right font-semibold">{title}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-t border-line">
                <td className="py-2 text-ink">{d.full}</td>
                <td className="py-2 text-right tabular-nums text-ink">{format(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div ref={wrapRef} className="relative" onMouseLeave={() => setHover(null)}>
          {total === 0 && emptyText ? (
            <p className="flex h-[220px] items-center justify-center text-muted">{emptyText}</p>
          ) : width > 0 ? (
            <svg width={width} height={H} role="img" aria-label={`${title}: column chart by month. Use "Show as table" for the values.`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="rgb(var(--line))" strokeWidth="1" />
                  <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted" fontSize="12">
                    {tickFormat(t)}
                  </text>
                </g>
              ))}
              {data.map((d, i) => {
                const cx = pad.left + band * i + band / 2;
                const h = (d.value / top) * plotH;
                return (
                  <g key={d.key}>
                    {d.value > 0 && (
                      <path d={columnPath(cx - colW / 2, y(d.value), colW, h)} fill="rgb(var(--chart-1))" opacity={hover === null || hover === i ? 1 : 0.45} />
                    )}
                    {i === peak && hover === null && (
                      <text x={cx} y={y(d.value) - 6} textAnchor="middle" className="fill-ink" fontSize="12" fontWeight="600">
                        {format(d.value)}
                      </text>
                    )}
                    {i % every === 0 && (
                      <text x={cx} y={H - 8} textAnchor="middle" className="fill-muted" fontSize="12">
                        {d.label}
                      </text>
                    )}
                    {/* Hit target: the whole band, taller and wider than the column */}
                    <rect
                      x={pad.left + band * i}
                      y={pad.top}
                      width={band}
                      height={plotH}
                      fill="transparent"
                      onMouseEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                      tabIndex={0}
                      aria-label={`${d.full}: ${format(d.value)}`}
                      className="outline-none"
                    />
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="h-[220px]" />
          )}

          {hover !== null && width > 0 && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-raised px-3 py-2 text-sm shadow-lg"
              style={{
                left: Math.min(Math.max(pad.left + band * hover + band / 2, 70), width - 70),
                top: Math.max(y(data[hover].value) - 8, 40),
              }}
            >
              <p className="font-semibold text-ink">{data[hover].full}</p>
              <p className="text-muted">{format(data[hover].value)}</p>
              {data[hover].extra && <p className="text-muted">{data[hover].extra}</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Ranked horizontal bars with the value at each tip. Few items, so each is labelled. */
export function RankedBars({ title, subtitle, items, format, emptyText }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      <div>
        <h2 className="font-display text-lg font-medium text-ink">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-muted">{emptyText}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((it) => (
            <li key={it.key} className="flex flex-col gap-1.5" title={it.extra}>
              <span className="truncate text-sm text-ink">{it.label}</span>
              <span className="flex items-center gap-3">
                <span className="h-3 rounded-r-[4px]" style={{ width: `${Math.max(2, (it.value / max) * 80)}%`, background: "rgb(var(--chart-1))" }} aria-hidden="true" />
                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{format(it.value)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}


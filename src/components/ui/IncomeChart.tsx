/**
 * SVG line chart — two-series (tithe + offerings).
 * Uses Catmull-Rom → Cubic-Bézier conversion for smooth curves.
 * Supports hover tooltip via HTML overlay.
 */

import { useState, useRef } from "react";

const monthlyData = [
  { month: "Nov", tithe: 14200, offerings: 7800 },
  { month: "Dec", tithe: 16800, offerings: 9200 },
  { month: "Jan", tithe: 15400, offerings: 8100 },
  { month: "Feb", tithe: 17200, offerings: 8900 },
  { month: "Mar", tithe: 16100, offerings: 8500 },
  { month: "Apr", tithe: 18450, offerings: 9200 },
];

// ── SVG coordinate constants ──────────────────────────────────────────────────
const VW = 560;
const VH = 140;
const PAD = { l: 48, r: 16, t: 14, b: 30 };
const PW = VW - PAD.l - PAD.r;
const PH = VH - PAD.t - PAD.b;

const Y_MIN = 0;
const Y_MAX = 22000;
const Y_RANGE = Y_MAX - Y_MIN;

const GRID_VALS = [5000, 10000, 15000, 20000];

function vy(v: number) {
  return PAD.t + (1 - (v - Y_MIN) / Y_RANGE) * PH;
}
function vx(i: number) {
  return PAD.l + (i / (monthlyData.length - 1)) * PW;
}

// ── Catmull-Rom → cubic Bézier path ─────────────────────────────────────────
function smoothPath(pts: { x: number; y: number }[], tension = 0.35): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

// Pre-compute point arrays
const tithePts = monthlyData.map((d, i) => ({ x: vx(i), y: vy(d.tithe) }));
const offerPts = monthlyData.map((d, i) => ({ x: vx(i), y: vy(d.offerings) }));
const bottomY  = PAD.t + PH;
const lastIdx  = monthlyData.length - 1;

const titheSmoothLine = smoothPath(tithePts);
const offerSmoothLine = smoothPath(offerPts);

const titheAreaPath =
  titheSmoothLine +
  ` L${tithePts[lastIdx].x.toFixed(2)},${bottomY} L${tithePts[0].x.toFixed(2)},${bottomY} Z`;
const offerAreaPath =
  offerSmoothLine +
  ` L${offerPts[lastIdx].x.toFixed(2)},${bottomY} L${offerPts[0].x.toFixed(2)},${bottomY} Z`;

// ─────────────────────────────────────────────────────────────────────────────

export function IncomeChart() {
  const last      = monthlyData[lastIdx];
  const prev      = monthlyData[lastIdx - 1];
  const lastTotal = last.tithe + last.offerings;
  const prevTotal = prev.tithe + prev.offerings;
  const growth    = (((lastTotal - prevTotal) / prevTotal) * 100).toFixed(1);
  const lastTithePt = tithePts[lastIdx];
  const lastOfferPt = offerPts[lastIdx];

  const containerRef = useRef<HTMLDivElement>(null);
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const [tooltipX, setTooltipX] = useState(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = e.clientX - rect.left;
    const svgX  = (relX / rect.width) * VW;
    let closest = 0;
    let minD    = Infinity;
    monthlyData.forEach((_, i) => {
      const d = Math.abs(vx(i) - svgX);
      if (d < minD) { minD = d; closest = i; }
    });
    setHovIdx(closest);
    setTooltipX(relX);
  }

  function handleMouseLeave() {
    setHovIdx(null);
  }

  const containerWidth = containerRef.current?.clientWidth ?? 600;
  const TOOLTIP_W = 138;
  const tooltipLeft =
    tooltipX > containerWidth / 2
      ? tooltipX - TOOLTIP_W - 12
      : tooltipX + 12;

  return (
    <div className="bg-[#1C1828] border border-[#2E2840] rounded-2xl overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-[#2E2840]/60">
        <div>
          <h2 className="text-sm font-semibold text-white">Income Trend</h2>
          <p className="text-xs mt-1">
            <span className="font-semibold text-emerald-400">↑ {growth}%</span>
            <span className="text-[#6B6880] ml-1">vs last month</span>
          </p>
          <p className="text-[11px] text-[#8B879C] mt-0.5">
            GH₵{lastTotal.toLocaleString()} total this month
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-start gap-6 text-right pt-0.5">
          <div>
            <p className="text-[10px] text-[#8B879C] flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0" />
              Tithe · Apr
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              GH₵{last.tithe.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#8B879C] flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0" />
              Offerings · Apr
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              GH₵{last.offerings.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ── SVG Chart ──────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="w-full relative cursor-crosshair"
        style={{ height: 196 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="icTitheArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#FBBF24" stopOpacity="0.22" />
              <stop offset="70%"  stopColor="#FBBF24" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#FBBF24" stopOpacity="0"    />
            </linearGradient>
            <linearGradient id="icOfferArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#34D399" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0"    />
            </linearGradient>
            <linearGradient id="icTitheLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#FBBF24" stopOpacity="0.15" />
              <stop offset="35%"  stopColor="#FBBF24" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#FBBF24" stopOpacity="1"    />
            </linearGradient>
            <linearGradient id="icOfferLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#34D399" stopOpacity="0.15" />
              <stop offset="35%"  stopColor="#34D399" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="1"    />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines + labels — higher contrast */}
          {GRID_VALS.map((v) => {
            const y = vy(v);
            return (
              <g key={v}>
                <line
                  x1={PAD.l} y1={y} x2={VW - PAD.r} y2={y}
                  stroke="#2E2840" strokeWidth={0.8} strokeDasharray="3,5"
                />
                <text
                  x={PAD.l - 7} y={y + 3.5}
                  textAnchor="end" fontSize={7.5} fill="#7A7890"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                </text>
              </g>
            );
          })}

          {/* X-axis bottom line */}
          <line
            x1={PAD.l} y1={bottomY} x2={VW - PAD.r} y2={bottomY}
            stroke="#2E2840" strokeWidth={0.6}
          />

          {/* X-axis month labels — higher contrast */}
          {monthlyData.map((d, i) => {
            const isLast = i === lastIdx;
            return (
              <text
                key={d.month}
                x={vx(i)} y={VH - 7}
                textAnchor="middle"
                fontSize={8}
                fill={isLast ? "#FBBF24" : "#7A7890"}
                fontWeight={isLast ? "700" : "500"}
              >
                {d.month}
              </text>
            );
          })}

          {/* Area fills */}
          <path d={titheAreaPath} fill="url(#icTitheArea)" />
          <path d={offerAreaPath} fill="url(#icOfferArea)" />

          {/* Tithe line — thicker */}
          <path
            d={titheSmoothLine}
            fill="none"
            stroke="url(#icTitheLine)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Offerings line — thicker */}
          <path
            d={offerSmoothLine}
            fill="none"
            stroke="url(#icOfferLine)"
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Past data dots */}
          {tithePts.slice(0, -1).map((p, i) => (
            <circle key={`t${i}`} cx={p.x} cy={p.y} r={2.5}
              fill="#1C1828" stroke="#FBBF24" strokeWidth={1.4} strokeOpacity={0.5}
            />
          ))}
          {offerPts.slice(0, -1).map((p, i) => (
            <circle key={`o${i}`} cx={p.x} cy={p.y} r={2.5}
              fill="#1C1828" stroke="#34D399" strokeWidth={1.4} strokeOpacity={0.45}
            />
          ))}

          {/* Current month endpoint — pulse rings */}
          <circle cx={lastTithePt.x} cy={lastTithePt.y} r={11} fill="#FBBF24" fillOpacity={0.06} />
          <circle cx={lastTithePt.x} cy={lastTithePt.y} r={5.5} fill="#FBBF24" fillOpacity={0.20} />
          <circle cx={lastTithePt.x} cy={lastTithePt.y} r={3.2} fill="#FBBF24" />

          <circle cx={lastOfferPt.x} cy={lastOfferPt.y} r={10}  fill="#34D399" fillOpacity={0.06} />
          <circle cx={lastOfferPt.x} cy={lastOfferPt.y} r={5}   fill="#34D399" fillOpacity={0.20} />
          <circle cx={lastOfferPt.x} cy={lastOfferPt.y} r={3}   fill="#34D399" />

          {/* ── Hover crosshair ─────────────────────────────────────── */}
          {hovIdx !== null && (() => {
            const hx = vx(hovIdx);
            const ty = vy(monthlyData[hovIdx].tithe);
            const oy = vy(monthlyData[hovIdx].offerings);
            return (
              <g>
                {/* Vertical guide line */}
                <line
                  x1={hx} y1={PAD.t} x2={hx} y2={bottomY}
                  stroke="#3E3858" strokeWidth={1.2} strokeDasharray="3,4"
                />
                {/* Tithe dot */}
                <circle cx={hx} cy={ty} r={5}   fill="#1C1828" stroke="#FBBF24" strokeWidth={2} />
                <circle cx={hx} cy={ty} r={2.5} fill="#FBBF24" />
                {/* Offerings dot */}
                <circle cx={hx} cy={oy} r={5}   fill="#1C1828" stroke="#34D399" strokeWidth={2} />
                <circle cx={hx} cy={oy} r={2.5} fill="#34D399" />
              </g>
            );
          })()}
        </svg>

        {/* ── HTML Tooltip overlay ──────────────────────────────────── */}
        {hovIdx !== null && (
          <div
            className="absolute top-3 pointer-events-none z-20"
            style={{ left: tooltipLeft, width: TOOLTIP_W }}
          >
            <div className="bg-[#1E1B2C] border border-[#3E3858] rounded-xl px-3.5 py-3 shadow-2xl shadow-black/50">
              <p className="text-[10px] font-bold text-[#8B879C] uppercase tracking-[0.1em] mb-2.5">
                {monthlyData[hovIdx].month} 2026
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-[11px] text-[#8B879C]">Tithe</span>
                  </div>
                  <span className="text-[11px] font-bold text-white">
                    GH₵{monthlyData[hovIdx].tithe.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-[11px] text-[#8B879C]">Offering</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-300">
                    GH₵{monthlyData[hovIdx].offerings.toLocaleString()}
                  </span>
                </div>
                <div className="pt-1.5 mt-0.5 border-t border-[#2E2840] flex justify-between">
                  <span className="text-[10px] text-[#6B6880]">Total</span>
                  <span className="text-[11px] font-bold text-white">
                    GH₵{(monthlyData[hovIdx].tithe + monthlyData[hovIdx].offerings).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

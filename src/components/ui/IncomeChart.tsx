/**
 * SVG line chart — two-series (tithe + offerings), live data from Tauri.
 * Uses Catmull-Rom → Cubic-Bézier conversion for smooth curves.
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { tauriGetTitheSummary, tauriGetOfferingsSummary } from "@/lib/tauri";

// ── SVG coordinate constants ──────────────────────────────────────────────────
const VW  = 560;
const VH  = 140;
const PAD = { l: 48, r: 16, t: 14, b: 30 };
const PW  = VW - PAD.l - PAD.r;
const PH  = VH - PAD.t - PAD.b;

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function vy(v: number, yMax: number) {
  return PAD.t + (1 - v / Math.max(yMax, 1)) * PH;
}
function vx(i: number, len: number) {
  return PAD.l + (i / Math.max(len - 1, 1)) * PW;
}

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

export function IncomeChart() {
  const now      = new Date();
  const year     = now.getFullYear();
  const prevYear = year - 1;

  const [titheThis,  setTitheThis]  = useState<{ month: number; total: number }[]>([]);
  const [tithePrev,  setTithePrev]  = useState<{ month: number; total: number }[]>([]);
  const [offerThis,  setOfferThis]  = useState<{ month: number; total: number }[]>([]);
  const [offerPrev,  setOfferPrev]  = useState<{ month: number; total: number }[]>([]);

  useEffect(() => {
    tauriGetTitheSummary(year).then(setTitheThis).catch(console.error);
    tauriGetTitheSummary(prevYear).then(setTithePrev).catch(console.error);
    tauriGetOfferingsSummary(year)
      .then((s) => setOfferThis(s.monthly))
      .catch(console.error);
    tauriGetOfferingsSummary(prevYear)
      .then((s) => setOfferPrev(s.monthly))
      .catch(console.error);
  }, []);

  // ── Build last 6 months of data ───────────────────────────────────────────
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d    = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const m    = d.getMonth() + 1;
      const y    = d.getFullYear();
      const isCurrentYear = y === year;

      const titheArr = isCurrentYear ? titheThis : tithePrev;
      const offerArr = isCurrentYear ? offerThis  : offerPrev;

      return {
        month:    MONTH_LABELS[m - 1],
        year:     y,
        isLast:   i === 5,
        tithe:    titheArr.find(t => t.month === m)?.total     ?? 0,
        offerings: offerArr.find(o => o.month === m)?.total    ?? 0,
      };
    });
  }, [titheThis, tithePrev, offerThis, offerPrev]);

  // ── Chart math ────────────────────────────────────────────────────────────
  const allVals = monthlyData.flatMap(d => [d.tithe, d.offerings]);
  const rawMax  = Math.max(...allVals, 1000);
  const Y_MAX   = Math.ceil(rawMax / 5000) * 5000;
  const GRID_VALS = [0.25, 0.5, 0.75, 1].map(f => Math.round(Y_MAX * f));

  const len      = monthlyData.length;
  const bottomY  = PAD.t + PH;
  const lastIdx  = len - 1;

  const tithePts = monthlyData.map((d, i) => ({ x: vx(i, len), y: vy(d.tithe,     Y_MAX) }));
  const offerPts = monthlyData.map((d, i) => ({ x: vx(i, len), y: vy(d.offerings, Y_MAX) }));

  const titheSmoothLine = smoothPath(tithePts);
  const offerSmoothLine = smoothPath(offerPts);
  const titheAreaPath   = titheSmoothLine + ` L${tithePts[lastIdx].x.toFixed(2)},${bottomY} L${tithePts[0].x.toFixed(2)},${bottomY} Z`;
  const offerAreaPath   = offerSmoothLine + ` L${offerPts[lastIdx].x.toFixed(2)},${bottomY} L${offerPts[0].x.toFixed(2)},${bottomY} Z`;

  const last        = monthlyData[lastIdx];
  const prev        = monthlyData[lastIdx - 1];
  const lastTotal   = last.tithe + last.offerings;
  const prevTotal   = prev.tithe + prev.offerings;
  const growth      = prevTotal > 0 ? (((lastTotal - prevTotal) / prevTotal) * 100).toFixed(1) : "0.0";
  const growthPos   = parseFloat(growth) >= 0;

  const lastTithePt = tithePts[lastIdx];
  const lastOfferPt = offerPts[lastIdx];

  // ── Hover state ───────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovIdx,    setHovIdx]    = useState<number | null>(null);
  const [tooltipX,  setTooltipX]  = useState(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = e.clientX - rect.left;
    const svgX = (relX / rect.width) * VW;
    let closest = 0, minD = Infinity;
    monthlyData.forEach((_, i) => {
      const d = Math.abs(vx(i, len) - svgX);
      if (d < minD) { minD = d; closest = i; }
    });
    setHovIdx(closest);
    setTooltipX(relX);
  }

  const containerWidth = containerRef.current?.clientWidth ?? 600;
  const TOOLTIP_W = 138;
  const tooltipLeft = tooltipX > containerWidth / 2 ? tooltipX - TOOLTIP_W - 12 : tooltipX + 12;

  return (
    <div className="bg-[#1C1828] border border-[#2E2840] rounded-2xl overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-[#2E2840]/60">
        <div>
          <h2 className="text-sm font-semibold text-white">Income Trend</h2>
          <p className="text-xs mt-1">
            <span className={growthPos ? "font-semibold text-emerald-400" : "font-semibold text-rose-400"}>
              {growthPos ? "↑" : "↓"} {Math.abs(parseFloat(growth))}%
            </span>
            <span className="text-[#6B6880] ml-1">vs last month</span>
          </p>
          <p className="text-[11px] text-[#8B879C] mt-0.5">
            GH₵{lastTotal.toLocaleString()} total this month
          </p>
        </div>

        <div className="flex items-start gap-6 text-right pt-0.5">
          <div>
            <p className="text-[10px] text-[#8B879C] flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0" />
              Tithe · {last.month}
            </p>
            <p className="text-sm font-bold text-white mt-0.5">GH₵{last.tithe.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#8B879C] flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0" />
              Offerings · {last.month}
            </p>
            <p className="text-sm font-bold text-white mt-0.5">GH₵{last.offerings.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* ── SVG Chart ────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="w-full relative cursor-crosshair"
        style={{ height: 196 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovIdx(null)}
      >
        <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <linearGradient id="icTitheArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#FBBF24" stopOpacity="0.14" />
              <stop offset="70%"  stopColor="#FBBF24" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#FBBF24" stopOpacity="0"    />
            </linearGradient>
            <linearGradient id="icOfferArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#34D399" stopOpacity="0.07" />
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

          {GRID_VALS.map((v) => {
            const y = vy(v, Y_MAX);
            return (
              <g key={v}>
                <line x1={PAD.l} y1={y} x2={VW - PAD.r} y2={y}
                  stroke="#3A3658" strokeWidth={1} strokeDasharray="3,5" />
                <text x={PAD.l - 7} y={y + 3.5} textAnchor="end" fontSize={7.5} fill="#9490A8"
                  fontFamily="JetBrains Mono, monospace">
                  {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                </text>
              </g>
            );
          })}

          <line x1={PAD.l} y1={bottomY} x2={VW - PAD.r} y2={bottomY} stroke="#2E2840" strokeWidth={0.6} />

          {monthlyData.map((d, i) => (
            <text key={d.month + i} x={vx(i, len)} y={VH - 7} textAnchor="middle"
              fontSize={8} fill={d.isLast ? "#FBBF24" : "#9490A8"} fontWeight={d.isLast ? "700" : "500"}>
              {d.month}
            </text>
          ))}

          <path d={titheAreaPath} fill="url(#icTitheArea)" />
          <path d={offerAreaPath} fill="url(#icOfferArea)" />
          <path d={titheSmoothLine} fill="none" stroke="url(#icTitheLine)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          <path d={offerSmoothLine} fill="none" stroke="url(#icOfferLine)" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />

          {tithePts.slice(0, -1).map((p, i) => (
            <circle key={`t${i}`} cx={p.x} cy={p.y} r={2.5}
              fill="#1C1828" stroke="#FBBF24" strokeWidth={1.4} strokeOpacity={0.5} />
          ))}
          {offerPts.slice(0, -1).map((p, i) => (
            <circle key={`o${i}`} cx={p.x} cy={p.y} r={2.5}
              fill="#1C1828" stroke="#34D399" strokeWidth={1.4} strokeOpacity={0.45} />
          ))}

          <circle cx={lastTithePt.x} cy={lastTithePt.y} r={11}  fill="#FBBF24" fillOpacity={0.06} />
          <circle cx={lastTithePt.x} cy={lastTithePt.y} r={5.5} fill="#FBBF24" fillOpacity={0.20} />
          <circle cx={lastTithePt.x} cy={lastTithePt.y} r={3.2} fill="#FBBF24" />
          <circle cx={lastOfferPt.x} cy={lastOfferPt.y} r={10}  fill="#34D399" fillOpacity={0.06} />
          <circle cx={lastOfferPt.x} cy={lastOfferPt.y} r={5}   fill="#34D399" fillOpacity={0.20} />
          <circle cx={lastOfferPt.x} cy={lastOfferPt.y} r={3}   fill="#34D399" />

          {hovIdx !== null && (() => {
            const hx = vx(hovIdx, len);
            const ty = vy(monthlyData[hovIdx].tithe,     Y_MAX);
            const oy = vy(monthlyData[hovIdx].offerings, Y_MAX);
            return (
              <g>
                <line x1={hx} y1={PAD.t} x2={hx} y2={bottomY}
                  stroke="#3E3858" strokeWidth={1.2} strokeDasharray="3,4" />
                <circle cx={hx} cy={ty} r={5}   fill="#1C1828" stroke="#FBBF24" strokeWidth={2} />
                <circle cx={hx} cy={ty} r={2.5} fill="#FBBF24" />
                <circle cx={hx} cy={oy} r={5}   fill="#1C1828" stroke="#34D399" strokeWidth={2} />
                <circle cx={hx} cy={oy} r={2.5} fill="#34D399" />
              </g>
            );
          })()}
        </svg>

        {hovIdx !== null && (
          <div className="absolute top-3 pointer-events-none z-20" style={{ left: tooltipLeft, width: TOOLTIP_W }}>
            <div className="bg-[#1E1B2C] border border-[#3E3858] rounded-xl px-3.5 py-3 shadow-2xl shadow-black/50">
              <p className="text-[10px] font-bold text-[#8B879C] uppercase tracking-[0.1em] mb-2.5">
                {monthlyData[hovIdx].month} {monthlyData[hovIdx].year}
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

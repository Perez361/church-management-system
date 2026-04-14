import { useState, useEffect, useMemo } from "react";
import {
  BarChart3, HandCoins, Church, HeartHandshake, Users, TrendingUp,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { departmentNames } from "@/lib/mockData";
import {
  tauriGetDashboardStats,
  tauriGetTitheSummary,
  tauriGetOfferingsSummary,
  tauriGetTithePayments,
  tauriGetMembers,
  tauriGetWelfareContributions,
  type DashboardStats,
  type MemberSummary,
  type TithePayment,
  type OfferingsSummary,
} from "@/lib/tauri";

type Period = "monthly" | "quarterly" | "yearly";

// ── Chart constants ──────────────────────────────────────────────────────────
const VW = 560; const VH = 120;
const PAD = { l: 52, r: 16, t: 10, b: 28 };
const PW = VW - PAD.l - PAD.r;
const PH = VH - PAD.t - PAD.b;

function vy(v: number, yMax: number) { return PAD.t + (1 - v / yMax) * PH; }
function vx(i: number, len: number)  { return PAD.l + (i / Math.max(len - 1, 1)) * PW; }

const CAT_COLORS = [
  { dot: "bg-amber-400",   bar: "bg-amber-400"   },
  { dot: "bg-emerald-400", bar: "bg-emerald-400" },
  { dot: "bg-blue-400",    bar: "bg-blue-400"    },
  { dot: "bg-rose-400",    bar: "bg-rose-400"    },
  { dot: "bg-purple-400",  bar: "bg-purple-400"  },
];

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const QUARTERS     = ["Q1 (Jan–Mar)","Q2 (Apr–Jun)","Q3 (Jul–Sep)","Q4 (Oct–Dec)"];

// ── Chart component (shared) ─────────────────────────────────────────────────
function IncomeLineChart({
  data, yMax,
}: {
  data: { label: string; tithe: number; offerings: number; isLast?: boolean }[];
  yMax: number;
}) {
  const gridVals = [0.25, 0.5, 0.75, 1].map((f) => Math.round(yMax * f));
  const tithePts = data.map((d, i) => ({ x: vx(i, data.length), y: vy(d.tithe,     yMax) }));
  const offerPts = data.map((d, i) => ({ x: vx(i, data.length), y: vy(d.offerings, yMax) }));
  const bottomY  = PAD.t + PH;

  const tLine = tithePts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const tArea = tLine + ` L${tithePts.at(-1)!.x.toFixed(1)},${bottomY} L${tithePts[0].x.toFixed(1)},${bottomY} Z`;
  const oLine = offerPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id="rptTitheArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rptTitheLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="rptOfferLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#34D399" stopOpacity="1" />
        </linearGradient>
      </defs>
      {gridVals.map((v) => {
        const y = vy(v, yMax);
        return (
          <g key={v}>
            <line x1={PAD.l} y1={y} x2={VW - PAD.r} y2={y} stroke="#2E2840" strokeWidth={0.6} strokeDasharray="2,3" />
            <text x={PAD.l - 6} y={y + 3.5} textAnchor="end" fontSize={7.5} fill="#5C5870">
              {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => (
        <text key={d.label + i} x={vx(i, data.length)} y={VH - 5} textAnchor="middle" fontSize={8}
          fill={d.isLast ? "#FBBF24" : "#5C5870"}
          fontWeight={d.isLast ? "700" : "400"}>
          {d.label}
        </text>
      ))}
      <path d={tArea} fill="url(#rptTitheArea)" />
      <path d={tLine} fill="none" stroke="url(#rptTitheLine)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <path d={oLine}  fill="none" stroke="url(#rptOfferLine)"  strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      {tithePts.slice(0, -1).map((p, i) => (
        <circle key={`t${i}`} cx={p.x} cy={p.y} r={2.5} fill="#1C1828" stroke="#FBBF24" strokeWidth={1.2} strokeOpacity={0.5} />
      ))}
      {offerPts.slice(0, -1).map((p, i) => (
        <circle key={`o${i}`} cx={p.x} cy={p.y} r={2.5} fill="#1C1828" stroke="#34D399" strokeWidth={1.2} strokeOpacity={0.5} />
      ))}
      {tithePts.at(-1) && <>
        <circle cx={tithePts.at(-1)!.x} cy={tithePts.at(-1)!.y} r={9} fill="#FBBF24" fillOpacity={0.12} />
        <circle cx={tithePts.at(-1)!.x} cy={tithePts.at(-1)!.y} r={4} fill="#FBBF24" />
      </>}
      {offerPts.at(-1) && <>
        <circle cx={offerPts.at(-1)!.x} cy={offerPts.at(-1)!.y} r={8} fill="#34D399" fillOpacity={0.12} />
        <circle cx={offerPts.at(-1)!.x} cy={offerPts.at(-1)!.y} r={3.5} fill="#34D399" />
      </>}
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function ReportsPage() {
  const now            = new Date();
  const currentYear    = now.getFullYear();

  const [period,      setPeriod]      = useState<Period>("monthly");
  const [reportYear,  setReportYear]  = useState(currentYear);
  const [stats,       setStats]       = useState<DashboardStats | null>(null);
  const [titheThis,   setTitheThis]   = useState<{ month: number; total: number; payers: number }[]>([]);
  const [tithePrev,   setTithePrev]   = useState<{ month: number; total: number; payers: number }[]>([]);
  const [offerThis,   setOfferThis]   = useState<OfferingsSummary>({ monthly: [], by_category: [] });
  const [offerPrev,   setOfferPrev]   = useState<OfferingsSummary>({ monthly: [], by_category: [] });
  const [titheMonth,  setTitheMonth]  = useState<TithePayment[]>([]);
  const [titheYear,   setTitheYear]   = useState<TithePayment[]>([]);
  const [members,     setMembers]     = useState<MemberSummary[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [givingSort,  setGivingSort]  = useState<"amount" | "payments">("amount");

  // Reload when year changes
  useEffect(() => {
    setLoading(true);
    const month = now.getMonth() + 1;
    Promise.all([
      tauriGetDashboardStats(),
      tauriGetTitheSummary(reportYear),
      tauriGetTitheSummary(reportYear - 1),
      tauriGetOfferingsSummary(reportYear),
      tauriGetOfferingsSummary(reportYear - 1),
      tauriGetTithePayments(month, reportYear),
      tauriGetTithePayments(undefined, reportYear),
      tauriGetMembers(),
    ])
      .then(([s, tThis, tPrev, oThis, oPrev, tm, ty, mems]) => {
        setStats(s);
        setTitheThis(tThis);
        setTithePrev(tPrev);
        setOfferThis(oThis);
        setOfferPrev(oPrev);
        setTitheMonth(tm);
        setTitheYear(ty);
        setMembers(mems);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [reportYear]);

  // ── Monthly: last 6 months (rolling, always ends at current month of reportYear) ─
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d  = new Date(reportYear, now.getMonth() - (5 - i), 1);
      const m  = d.getMonth() + 1;
      const y  = d.getFullYear();
      const isCY = y === reportYear;
      const titheArr = isCY ? titheThis : tithePrev;
      const offerArr = isCY ? offerThis.monthly : offerPrev.monthly;
      return {
        label:     MONTH_LABELS[m - 1],
        tithe:     titheArr.find((t) => t.month === m)?.total    ?? 0,
        offerings: offerArr.find((o) => o.month === m)?.total    ?? 0,
        isLast:    i === 5,
      };
    });
  }, [titheThis, tithePrev, offerThis, offerPrev, reportYear]);

  // ── Quarterly: 4 quarters of reportYear ─────────────────────────────────────
  const quarterlyData = useMemo(() => {
    return [
      { months: [1, 2, 3],   label: "Q1" },
      { months: [4, 5, 6],   label: "Q2" },
      { months: [7, 8, 9],   label: "Q3" },
      { months: [10, 11, 12],label: "Q4" },
    ].map(({ months, label }, qi) => ({
      label,
      tithe:     months.reduce((s, m) => s + (titheThis.find((t) => t.month === m)?.total    ?? 0), 0),
      offerings: months.reduce((s, m) => s + (offerThis.monthly.find((o) => o.month === m)?.total ?? 0), 0),
      isLast:    qi === 3,
    }));
  }, [titheThis, offerThis]);

  // ── Yearly: full 12 months of reportYear ────────────────────────────────────
  const yearlyData = useMemo(() => {
    return MONTH_LABELS.map((label, i) => ({
      label,
      tithe:     titheThis.find((t) => t.month === i + 1)?.total    ?? 0,
      offerings: offerThis.monthly.find((o) => o.month === i + 1)?.total ?? 0,
      isLast:    i === 11,
    }));
  }, [titheThis, offerThis]);

  const chartData = period === "monthly" ? monthlyData
    : period === "quarterly" ? quarterlyData
    : yearlyData;

  const allVals = chartData.flatMap((d) => [d.tithe, d.offerings]);
  const rawMax  = Math.max(...allVals, 1000);
  const Y_MAX   = Math.ceil(rawMax / 5000) * 5000;

  // ── KPI values ───────────────────────────────────────────────────────────────
  const totalIncome     = chartData.reduce((s, d) => s + d.tithe + d.offerings, 0);
  const thisMonthIncome = (stats?.tithe_this_month ?? 0) + (stats?.offerings_this_month ?? 0);
  const prevIncome      = period === "monthly"
    ? (monthlyData.at(-2)?.tithe ?? 0) + (monthlyData.at(-2)?.offerings ?? 0)
    : period === "quarterly"
    ? (quarterlyData.at(-2)?.tithe ?? 0) + (quarterlyData.at(-2)?.offerings ?? 0)
    : 0;
  const growthPct      = prevIncome > 0
    ? (((thisMonthIncome - prevIncome) / prevIncome) * 100).toFixed(1)
    : "0.0";
  const growthPositive = parseFloat(growthPct) >= 0;

  // ── Top contributors ─────────────────────────────────────────────────────────
  const topContributors = useMemo(() => {
    const totals = titheMonth.reduce<Record<string, number>>((acc, p) => {
      acc[p.member_id] = (acc[p.member_id] ?? 0) + p.amount;
      return acc;
    }, {});
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, total]) => {
        const m = members.find((x) => x.id === id);
        return {
          name:  m ? `${m.first_name} ${m.last_name}` : "Unknown",
          total,
          dept:  m?.department_id ? (departmentNames[m.department_id] ?? m.department_id) : "",
        };
      });
  }, [titheMonth, members]);
  const maxContrib = topContributors[0]?.total ?? 1;

  // ── Annual member giving summary ─────────────────────────────────────────────
  const memberGivingSummary = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const p of titheYear) {
      const cur = map.get(p.member_id) ?? { total: 0, count: 0 };
      map.set(p.member_id, { total: cur.total + p.amount, count: cur.count + 1 });
    }
    return [...map.entries()]
      .map(([id, { total, count }]) => {
        const m = members.find((x) => x.id === id);
        return {
          id,
          name:   m ? `${m.first_name} ${m.last_name}` : "Unknown",
          no:     m?.member_no ?? "—",
          dept:   m?.department_id ? (departmentNames[m.department_id] ?? m.department_id) : "—",
          total,
          count,
        };
      })
      .sort((a, b) => givingSort === "amount" ? b.total - a.total : b.count - a.count);
  }, [titheYear, members, givingSort]);

  // ── Department breakdown ─────────────────────────────────────────────────────
  const activeByDept = useMemo(() => {
    return members
      .filter((m) => m.status === "active")
      .reduce<Record<string, number>>((acc, m) => {
        const d = m.department_id ?? "other";
        acc[d] = (acc[d] ?? 0) + 1;
        return acc;
      }, {});
  }, [members]);
  const activeTotal = members.filter((m) => m.status === "active").length;

  const offerCats     = offerThis.by_category.slice(0, 5);
  const offerCatTotal = offerCats.reduce((s, c) => s + c.total, 0);

  const currentMonthLabel = now.toLocaleDateString("en-GH", { month: "short" });

  const periodLabel = period === "monthly"   ? `6 Months (${reportYear})`
    : period === "quarterly" ? `Quarters (${reportYear})`
    : `12 Months (${reportYear})`;

  return (
    <div>
      <Header title="Reports" subtitle="Financial and member analytics" />

      <div className="p-4 md:p-6 space-y-4">

        {/* ── Period tabs + year selector ───────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-[#1C1828] border border-[#2E2840] rounded-xl p-1">
            {(["monthly", "quarterly", "yearly"] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 capitalize",
                  period === p ? "bg-amber-400/15 text-amber-400" : "text-[#9490A8] hover:text-white",
                )}>
                {p}
              </button>
            ))}
          </div>

          {/* Year navigator */}
          <div className="flex items-center gap-1 bg-[#1C1828] border border-[#2E2840] rounded-xl p-1">
            <button onClick={() => setReportYear((y) => y - 1)}
              className="p-1.5 rounded-lg text-[#9490A8] hover:text-white hover:bg-white/5 transition-all">
              <ChevronLeft size={13} />
            </button>
            <span className="px-3 py-1 text-sm font-semibold text-white min-w-[56px] text-center">
              {reportYear}
            </span>
            <button onClick={() => setReportYear((y) => y + 1)}
              className="p-1.5 rounded-lg text-[#9490A8] hover:text-white hover:bg-white/5 transition-all">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: `Total Income (${periodLabel})`, value: loading ? "—" : formatCurrency(totalIncome), Icon: BarChart3,  color: "text-amber-400",   bg: "bg-amber-400/10",   ring: "border-amber-400/20"   },
            { label: `${currentMonthLabel} Total`,    value: loading ? "—" : formatCurrency(thisMonthIncome), Icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10", ring: "border-emerald-400/20" },
            { label: `Tithe Payers (${currentMonthLabel})`, value: loading ? "—" : String(stats?.tithe_payers_month ?? 0), Icon: HandCoins, color: "text-blue-400", bg: "bg-blue-400/10", ring: "border-blue-400/20" },
            { label: "Active Members",                value: loading ? "—" : String(stats?.active_members ?? 0), Icon: Users,  color: "text-rose-400",    bg: "bg-rose-400/10",    ring: "border-rose-400/20"   },
          ].map(({ label, value, Icon, color, bg, ring }) => (
            <div key={label} className="bg-[#1C1828] border border-[#2E2840] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", bg, ring)}>
                  <Icon size={15} className={color} />
                </div>
                <p className="text-[11px] font-bold text-[#9490A8] uppercase tracking-wider leading-tight">{label}</p>
              </div>
              <p className="text-xl font-bold text-white leading-none">{value}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="flex gap-4 items-start">
          {/* Income chart */}
          <div className="flex-1 min-w-0 bg-[#1C1828] border border-[#2E2840] rounded-2xl overflow-hidden">
            <div className="flex items-start justify-between px-5 py-4 border-b border-[#2E2840]/50">
              <div>
                <h2 className="text-sm font-semibold text-white">Income Trend — {periodLabel}</h2>
                <p className="text-xs mt-0.5">
                  <span className={cn("font-semibold", growthPositive ? "text-emerald-400" : "text-rose-400")}>
                    {growthPositive ? "↑" : "↓"} {Math.abs(parseFloat(growthPct))}%
                  </span>
                  <span className="text-[#9490A8] ml-1">vs previous period</span>
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs pt-0.5">
                <span className="flex items-center gap-1.5 text-[#9490A8]">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Tithe
                </span>
                <span className="flex items-center gap-1.5 text-[#9490A8]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Offerings
                </span>
              </div>
            </div>
            <div className="w-full" style={{ height: 160 }}>
              {!loading && <IncomeLineChart data={chartData} yMax={Y_MAX} />}
            </div>

            {/* Quarterly detail table */}
            {period === "quarterly" && !loading && (
              <div className="border-t border-[#2E2840]/50 px-5 py-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {["Quarter","Period","Tithe","Offerings","Total"].map((h) => (
                        <th key={h} className="py-1.5 text-left text-[10px] font-bold text-[#9490A8] uppercase tracking-wider pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quarterlyData.map((q, i) => (
                      <tr key={q.label} className="border-t border-[#2E2840]/30">
                        <td className="py-2 font-semibold text-white pr-4">{q.label}</td>
                        <td className="py-2 text-[#9490A8] pr-4">{QUARTERS[i]}</td>
                        <td className="py-2 text-amber-400   pr-4">{formatCurrency(q.tithe)}</td>
                        <td className="py-2 text-emerald-400 pr-4">{formatCurrency(q.offerings)}</td>
                        <td className="py-2 font-semibold text-white">{formatCurrency(q.tithe + q.offerings)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-[#2E2840]">
                      <td colSpan={2} className="py-2 font-bold text-white">Year Total</td>
                      <td className="py-2 font-bold text-amber-400">{formatCurrency(quarterlyData.reduce((s, q) => s + q.tithe, 0))}</td>
                      <td className="py-2 font-bold text-emerald-400">{formatCurrency(quarterlyData.reduce((s, q) => s + q.offerings, 0))}</td>
                      <td className="py-2 font-bold text-white">{formatCurrency(totalIncome)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Yearly month breakdown table */}
            {period === "yearly" && !loading && (
              <div className="border-t border-[#2E2840]/50 px-5 py-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {["Month","Tithe","Offerings","Total"].map((h) => (
                        <th key={h} className="py-1.5 text-left text-[10px] font-bold text-[#9490A8] uppercase tracking-wider pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyData.map((d) => (
                      <tr key={d.label} className="border-t border-[#2E2840]/30">
                        <td className="py-1.5 font-medium text-white pr-4">{d.label}</td>
                        <td className="py-1.5 text-amber-400   pr-4">{d.tithe     > 0 ? formatCurrency(d.tithe)     : "—"}</td>
                        <td className="py-1.5 text-emerald-400 pr-4">{d.offerings > 0 ? formatCurrency(d.offerings) : "—"}</td>
                        <td className="py-1.5 font-semibold text-white">{(d.tithe + d.offerings) > 0 ? formatCurrency(d.tithe + d.offerings) : "—"}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-[#2E2840]">
                      <td className="py-2 font-bold text-white">Total</td>
                      <td className="py-2 font-bold text-amber-400">{formatCurrency(yearlyData.reduce((s, d) => s + d.tithe, 0))}</td>
                      <td className="py-2 font-bold text-emerald-400">{formatCurrency(yearlyData.reduce((s, d) => s + d.offerings, 0))}</td>
                      <td className="py-2 font-bold text-white">{formatCurrency(totalIncome)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Department breakdown */}
          <Card className="w-60 shrink-0">
            <CardHeader className="px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Users size={13} className="text-blue-400" />
                <h2 className="text-sm font-semibold text-white">Members by Dept</h2>
              </div>
            </CardHeader>
            <CardContent className="px-5 pt-3 pb-5 space-y-3">
              {loading ? (
                <p className="text-xs text-[#9490A8]">Loading…</p>
              ) : Object.entries(activeByDept).length === 0 ? (
                <p className="text-xs text-[#9490A8]">No data</p>
              ) : (
                Object.entries(activeByDept)
                  .sort(([, a], [, b]) => b - a)
                  .map(([dept, count]) => {
                    const pct = activeTotal > 0 ? Math.round((count / activeTotal) * 100) : 0;
                    return (
                      <div key={dept}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#9490A8] truncate mr-2">
                            {departmentNames[dept] ?? dept}
                          </span>
                          <span className="text-xs font-semibold text-white shrink-0">{count}</span>
                        </div>
                        <div className="h-1.5 bg-[#211D30] rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="flex gap-4">
          {/* Top contributors */}
          <Card className="flex-1">
            <CardHeader className="px-5 py-3.5">
              <div className="flex items-center gap-2">
                <HandCoins size={13} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-white">
                  Top Tithe Contributors — {currentMonthLabel} {reportYear}
                </h2>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="px-5 py-8 text-center text-xs text-[#9490A8]">Loading…</div>
              ) : topContributors.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-[#9490A8]">No tithe payments this month.</div>
              ) : (
                topContributors.map((c, i) => (
                  <div key={c.name + i}
                    className="flex items-center gap-4 px-5 py-3.5 border-b border-[#2E2840]/40 last:border-0 hover:bg-white/[0.018] transition-colors">
                    <span className="text-[11px] font-bold text-[#9490A8] w-4 shrink-0">{i + 1}</span>
                    <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 text-[10px] font-bold shrink-0">
                      {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                      {c.dept && <p className="text-[11px] text-[#9490A8]">{c.dept}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-amber-400">{formatCurrency(c.total)}</p>
                      <div className="w-24 h-1 bg-[#211D30] rounded-full overflow-hidden mt-1 ml-auto">
                        <div className="h-full bg-amber-400/60 rounded-full" style={{ width: `${(c.total / maxContrib) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Offering categories */}
          <Card className="w-72 shrink-0">
            <CardHeader className="px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Church size={13} className="text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Offering Categories — {reportYear}</h2>
              </div>
            </CardHeader>
            <CardContent className="px-5 pt-3 pb-5 space-y-3">
              {loading ? (
                <p className="text-xs text-[#9490A8]">Loading…</p>
              ) : offerCats.length === 0 ? (
                <p className="text-xs text-[#9490A8]">No offerings recorded.</p>
              ) : (
                <>
                  {offerCats.map(({ category, total }, i) => {
                    const pct = offerCatTotal > 0 ? Math.round((total / offerCatTotal) * 100) : 0;
                    const { dot, bar } = CAT_COLORS[i % CAT_COLORS.length];
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("w-1.5 h-1.5 rounded-full inline-block shrink-0", dot)} />
                            <span className="text-xs text-[#9490A8] truncate capitalize">{category}</span>
                          </div>
                          <span className="text-xs font-semibold text-white shrink-0">{formatCurrency(total)}</span>
                        </div>
                        <div className="h-1 bg-[#211D30] rounded-full overflow-hidden">
                          <div className={cn("h-full", bar)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-[#2E2840] flex items-center justify-between">
                    <span className="text-xs text-[#9490A8]">Total</span>
                    <span className="text-sm font-bold text-white">{formatCurrency(offerCatTotal)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Member giving summary */}
        <Card>
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HandCoins size={13} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-white">
                  Member Giving Summary — {reportYear}
                </h2>
              </div>
              <div className="flex items-center gap-1 bg-[#211D30] border border-[#2E2840] rounded-lg p-0.5">
                {(["amount", "payments"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setGivingSort(s)}
                    className={cn(
                      "px-3 py-1 rounded-md text-[10px] font-semibold transition-all capitalize",
                      givingSort === s ? "bg-amber-400/15 text-amber-400" : "text-[#9490A8] hover:text-white",
                    )}
                  >
                    By {s}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2E2840]/60">
                  {["#", "Member", "Member No", "Department", "Payments", "Total Tithe"].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10px] font-bold text-[#9490A8] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#9490A8]">Loading…</td></tr>
                ) : memberGivingSummary.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#9490A8]">No tithe payments recorded for {reportYear}.</td></tr>
                ) : memberGivingSummary.map((row, i) => (
                  <tr key={row.id} className="border-b border-[#2E2840]/40 last:border-0 hover:bg-white/[0.018] transition-colors">
                    <td className="px-5 py-3 text-xs font-bold text-[#9490A8]">{i + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400 text-[10px] font-bold shrink-0">
                          {row.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-white">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="font-mono text-xs text-[#9490A8]">{row.no}</span></td>
                    <td className="px-5 py-3"><span className="text-sm text-[#9490A8]">{row.dept}</span></td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-blue-400 font-semibold">{row.count}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-amber-400">{formatCurrency(row.total)}</span>
                        <div className="flex-1 max-w-[80px] h-1 bg-[#211D30] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400/50 rounded-full"
                            style={{ width: `${memberGivingSummary[0] ? (row.total / memberGivingSummary[0].total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {memberGivingSummary.length > 0 && (
                <tfoot>
                  <tr className="border-t border-[#2E2840] bg-[#17141F]">
                    <td colSpan={4} className="px-5 py-3 text-xs font-bold text-[#9490A8]">
                      {memberGivingSummary.length} contributors
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-blue-400">
                      {memberGivingSummary.reduce((s, r) => s + r.count, 0)}
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-amber-400">
                      {formatCurrency(memberGivingSummary.reduce((s, r) => s + r.total, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        {/* Welfare summary */}
        <Card>
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center gap-2">
              <HeartHandshake size={13} className="text-rose-400" />
              <h2 className="text-sm font-semibold text-white">Welfare Overview</h2>
            </div>
          </CardHeader>
          <CardContent className="px-5 pt-2 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {[
                { label: "Available Balance",       value: loading ? "—" : formatCurrency(stats?.welfare_balance ?? 0),          color: "text-rose-400"    },
                { label: "Contributors This Month",  value: loading ? "—" : String(stats?.welfare_contributors_month ?? 0),        color: "text-blue-400"    },
                { label: "Disbursed This Month",     value: loading ? "—" : formatCurrency(stats?.welfare_disbursed_month ?? 0),   color: "text-amber-400"   },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-[11px] text-[#9490A8] mb-1">{label}</p>
                  <p className={cn("text-lg font-bold", color)}>{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { BarChart3, HandCoins, Church, HeartHandshake, Users, TrendingUp } from "lucide-react";
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

function vy(v: number, yMax: number) {
  return PAD.t + (1 - v / yMax) * PH;
}
function vx(i: number, len: number) {
  return PAD.l + (i / Math.max(len - 1, 1)) * PW;
}

// ── Category color palette ───────────────────────────────────────────────────
const CAT_COLORS = [
  { dot: "bg-amber-400",   bar: "bg-amber-400"   },
  { dot: "bg-emerald-400", bar: "bg-emerald-400" },
  { dot: "bg-blue-400",    bar: "bg-blue-400"    },
  { dot: "bg-rose-400",    bar: "bg-rose-400"    },
  { dot: "bg-purple-400",  bar: "bg-purple-400"  },
];

// ── Month label helper ───────────────────────────────────────────────────────
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function ReportsPage() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [stats, setStats]   = useState<DashboardStats | null>(null);

  // Raw API data
  const [titheThis,  setTitheThis]  = useState<{ month: number; total: number; payers: number }[]>([]);
  const [tithePrev,  setTithePrev]  = useState<{ month: number; total: number; payers: number }[]>([]);
  const [offerThis,  setOfferThis]  = useState<OfferingsSummary>({ monthly: [], by_category: [] });
  const [offerPrev,  setOfferPrev]  = useState<OfferingsSummary>({ monthly: [], by_category: [] });
  const [titheMonth, setTitheMonth] = useState<TithePayment[]>([]);
  const [members,    setMembers]    = useState<MemberSummary[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const now      = new Date();
    const year     = now.getFullYear();
    const prevYear = year - 1;
    const month    = now.getMonth() + 1;

    Promise.all([
      tauriGetDashboardStats(),
      tauriGetTitheSummary(year),
      tauriGetTitheSummary(prevYear),
      tauriGetOfferingsSummary(year),
      tauriGetOfferingsSummary(prevYear),
      tauriGetTithePayments(month, year),
      tauriGetMembers(),
    ])
      .then(([s, tThis, tPrev, oThis, oPrev, tm, mems]) => {
        setStats(s);
        setTitheThis(tThis);
        setTithePrev(tPrev);
        setOfferThis(oThis);
        setOfferPrev(oPrev);
        setTitheMonth(tm);
        setMembers(mems);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Last 6 months chart data ─────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d    = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const m    = d.getMonth() + 1;
      const y    = d.getFullYear();
      const isCurrentYear = y === now.getFullYear();

      const titheArr = isCurrentYear ? titheThis : tithePrev;
      const offerArr = isCurrentYear ? offerThis.monthly : offerPrev.monthly;

      const tithe    = titheArr.find(t => t.month === m)?.total     ?? 0;
      const offerings = offerArr.find(o => o.month === m)?.total    ?? 0;
      return { month: MONTH_LABELS[m - 1], isLast: i === 5, tithe, offerings };
    });
  }, [titheThis, tithePrev, offerThis, offerPrev]);

  // ── Chart math ───────────────────────────────────────────────────────────
  const allVals = monthlyData.flatMap(d => [d.tithe, d.offerings]);
  const rawMax  = Math.max(...allVals, 1000);
  const Y_MAX   = Math.ceil(rawMax / 5000) * 5000;
  const GRID_VALS = [0.25, 0.5, 0.75, 1].map(f => Math.round(Y_MAX * f));

  const tithePts = monthlyData.map((d, i) => ({ x: vx(i, monthlyData.length), y: vy(d.tithe,     Y_MAX) }));
  const offerPts = monthlyData.map((d, i) => ({ x: vx(i, monthlyData.length), y: vy(d.offerings, Y_MAX) }));
  const bottomY  = PAD.t + PH;

  const titheLine = tithePts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const titheArea = titheLine + ` L${tithePts.at(-1)!.x.toFixed(1)},${bottomY} L${tithePts[0].x.toFixed(1)},${bottomY} Z`;
  const offerLine = offerPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // ── KPI values ───────────────────────────────────────────────────────────
  const totalIncome     = monthlyData.reduce((s, d) => s + d.tithe + d.offerings, 0);
  const thisMonthIncome = (stats?.tithe_this_month ?? 0) + (stats?.offerings_this_month ?? 0);
  const lastMonthIncome = (monthlyData.at(-2)?.tithe ?? 0) + (monthlyData.at(-2)?.offerings ?? 0);
  const growthPct       = lastMonthIncome > 0
    ? (((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100).toFixed(1)
    : "0.0";
  const growthPositive  = parseFloat(growthPct) >= 0;

  // ── Top contributors (this month) ────────────────────────────────────────
  const topContributors = useMemo(() => {
    const totals = titheMonth.reduce<Record<string, number>>((acc, p) => {
      acc[p.member_id] = (acc[p.member_id] ?? 0) + p.amount;
      return acc;
    }, {});
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, total]) => {
        const m = members.find(x => x.id === id);
        return {
          name: m ? `${m.first_name} ${m.last_name}` : "Unknown",
          total,
          dept: m?.department_id ? (departmentNames[m.department_id] ?? m.department_id) : "",
        };
      });
  }, [titheMonth, members]);
  const maxContrib = topContributors[0]?.total ?? 1;

  // ── Department breakdown (active members) ────────────────────────────────
  const activeByDept = useMemo(() => {
    return members
      .filter(m => m.status === "active")
      .reduce<Record<string, number>>((acc, m) => {
        const d = m.department_id ?? "other";
        acc[d] = (acc[d] ?? 0) + 1;
        return acc;
      }, {});
  }, [members]);
  const activeTotal = members.filter(m => m.status === "active").length;

  // ── Offering categories (this year) ─────────────────────────────────────
  const offerCats     = offerThis.by_category.slice(0, 5);
  const offerCatTotal = offerCats.reduce((s, c) => s + c.total, 0);

  // ── Current month label ──────────────────────────────────────────────────
  const currentMonthLabel = new Date().toLocaleDateString("en-GH", { month: "short" });

  return (
    <div>
      <Header title="Reports" subtitle="Financial and member analytics" />

      <div className="p-6 space-y-4">
        {/* Period tabs */}
        <div className="flex items-center gap-1 bg-(--color-card) border border-(--color-border) rounded-xl p-1 w-fit">
          {(["monthly", "quarterly", "yearly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 capitalize",
                period === p ? "bg-amber-400/15 text-amber-400" : "text-(--color-muted) hover:text-white"
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: "Total Income (6mo)",
              value: loading ? "—" : formatCurrency(totalIncome),
              Icon: BarChart3, color: "text-amber-400", bg: "bg-amber-400/10", ring: "border-amber-400/20",
            },
            {
              label: `${currentMonthLabel} Total`,
              value: loading ? "—" : formatCurrency(thisMonthIncome),
              Icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10", ring: "border-emerald-400/20",
            },
            {
              label: `Tithe Payers (${currentMonthLabel})`,
              value: loading ? "—" : String(stats?.tithe_payers_month ?? 0),
              Icon: HandCoins, color: "text-blue-400", bg: "bg-blue-400/10", ring: "border-blue-400/20",
            },
            {
              label: "Active Members",
              value: loading ? "—" : String(stats?.active_members ?? 0),
              Icon: Users, color: "text-rose-400", bg: "bg-rose-400/10", ring: "border-rose-400/20",
            },
          ].map(({ label, value, Icon, color, bg, ring }) => (
            <div key={label} className="bg-(--color-card) border border-(--color-border) rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", bg, ring)}>
                  <Icon size={15} className={color} />
                </div>
                <p className="text-[11px] font-bold text-(--color-muted) uppercase tracking-wider leading-tight">{label}</p>
              </div>
              <p className="text-xl font-bold text-white leading-none">{value}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="flex gap-4 items-start">
          {/* Income chart */}
          <div className="flex-1 min-w-0 bg-(--color-card) border border-(--color-border) rounded-2xl overflow-hidden">
            <div className="flex items-start justify-between px-5 py-4 border-b border-(--color-border)/50">
              <div>
                <h2 className="text-sm font-semibold text-white">Income Trend — 6 Months</h2>
                <p className="text-xs mt-0.5">
                  <span className={cn("font-semibold", growthPositive ? "text-emerald-400" : "text-rose-400")}>
                    {growthPositive ? "↑" : "↓"} {Math.abs(parseFloat(growthPct))}%
                  </span>
                  <span className="text-(--color-muted) ml-1">vs last month</span>
                </p>
              </div>
              <div className="flex items-center gap-4 text-right text-xs pt-0.5">
                <span className="flex items-center gap-1.5 text-(--color-muted)">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Tithe
                </span>
                <span className="flex items-center gap-1.5 text-(--color-muted)">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Offerings
                </span>
              </div>
            </div>
            <div className="w-full" style={{ height: 160 }}>
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
                {GRID_VALS.map((v) => {
                  const y = vy(v, Y_MAX);
                  return (
                    <g key={v}>
                      <line x1={PAD.l} y1={y} x2={VW - PAD.r} y2={y} stroke="#2E2840" strokeWidth={0.6} strokeDasharray="2,3" />
                      <text x={PAD.l - 6} y={y + 3.5} textAnchor="end" fontSize={7.5} fill="#5C5870">
                        {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      </text>
                    </g>
                  );
                })}
                {monthlyData.map((d, i) => (
                  <text key={d.month + i} x={vx(i, monthlyData.length)} y={VH - 5} textAnchor="middle" fontSize={8}
                    fill={d.isLast ? "#FBBF24" : "#5C5870"}
                    fontWeight={d.isLast ? "700" : "400"}>
                    {d.month}
                  </text>
                ))}
                <path d={titheArea} fill="url(#rptTitheArea)" />
                <path d={titheLine} fill="none" stroke="url(#rptTitheLine)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                <path d={offerLine} fill="none" stroke="url(#rptOfferLine)" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
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
            </div>
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
                <p className="text-xs text-(--color-muted)">Loading…</p>
              ) : Object.entries(activeByDept).length === 0 ? (
                <p className="text-xs text-(--color-muted)">No data</p>
              ) : (
                Object.entries(activeByDept)
                  .sort(([, a], [, b]) => b - a)
                  .map(([dept, count]) => {
                    const pct = activeTotal > 0 ? Math.round((count / activeTotal) * 100) : 0;
                    return (
                      <div key={dept}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-(--color-muted) truncate mr-2">
                            {departmentNames[dept] ?? dept}
                          </span>
                          <span className="text-xs font-semibold text-white shrink-0">{count}</span>
                        </div>
                        <div className="h-1.5 bg-(--color-card2) rounded-full overflow-hidden">
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
                  Top Tithe Contributors — {currentMonthLabel}
                </h2>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="px-5 py-8 text-center text-xs text-(--color-muted)">Loading…</div>
              ) : topContributors.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-(--color-muted)">No tithe payments recorded this month.</div>
              ) : (
                topContributors.map((c, i) => (
                  <div key={c.name + i}
                    className="flex items-center gap-4 px-5 py-3.5 border-b border-(--color-border)/40 last:border-0 hover:bg-white/[0.018] transition-colors">
                    <span className="text-[11px] font-bold text-(--color-muted) w-4 shrink-0">{i + 1}</span>
                    <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 text-[10px] font-bold shrink-0">
                      {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                      {c.dept && <p className="text-[11px] text-(--color-muted)">{c.dept}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-amber-400">{formatCurrency(c.total)}</p>
                      <div className="w-24 h-1 bg-(--color-card2) rounded-full overflow-hidden mt-1 ml-auto">
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
                <h2 className="text-sm font-semibold text-white">Offering Categories</h2>
              </div>
            </CardHeader>
            <CardContent className="px-5 pt-3 pb-5 space-y-3">
              {loading ? (
                <p className="text-xs text-(--color-muted)">Loading…</p>
              ) : offerCats.length === 0 ? (
                <p className="text-xs text-(--color-muted)">No offerings recorded.</p>
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
                            <span className="text-xs text-(--color-muted) truncate capitalize">{category}</span>
                          </div>
                          <span className="text-xs font-semibold text-white shrink-0">{formatCurrency(total)}</span>
                        </div>
                        <div className="h-1 bg-(--color-card2) rounded-full overflow-hidden">
                          <div className={cn("h-full", bar)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-(--color-border) flex items-center justify-between">
                    <span className="text-xs text-(--color-muted)">Total</span>
                    <span className="text-sm font-bold text-white">{formatCurrency(offerCatTotal)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Welfare summary card */}
        <Card>
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center gap-2">
              <HeartHandshake size={13} className="text-rose-400" />
              <h2 className="text-sm font-semibold text-white">Welfare Overview</h2>
            </div>
          </CardHeader>
          <CardContent className="px-5 pt-2 pb-4">
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: "Available Balance", value: loading ? "—" : formatCurrency(stats?.welfare_balance ?? 0), color: "text-rose-400" },
                { label: "Contributors This Month", value: loading ? "—" : String(stats?.welfare_contributors_month ?? 0), color: "text-blue-400" },
                { label: "Disbursed This Month", value: loading ? "—" : formatCurrency(stats?.welfare_disbursed_month ?? 0), color: "text-amber-400" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-[11px] text-(--color-muted) mb-1">{label}</p>
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

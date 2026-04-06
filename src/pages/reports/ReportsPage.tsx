import { useState } from "react";
import { BarChart3, HandCoins, Church, HeartHandshake, Users, TrendingUp } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { mockMembers, mockTithePayments, departmentNames } from "@/lib/mockData";

// ── Chart data ──────────────────────────────────────────────────────────────
const monthlyData = [
  { month: "Nov", tithe: 14200, offerings: 7800 },
  { month: "Dec", tithe: 16800, offerings: 9200 },
  { month: "Jan", tithe: 15400, offerings: 8100 },
  { month: "Feb", tithe: 17200, offerings: 8900 },
  { month: "Mar", tithe: 16100, offerings: 8500 },
  { month: "Apr", tithe: 18450, offerings: 9200 },
];

const VW = 560; const VH = 120;
const PAD = { l: 52, r: 16, t: 10, b: 28 };
const PW = VW - PAD.l - PAD.r;
const PH = VH - PAD.t - PAD.b;
const Y_MAX = 22000; const Y_MIN = 0; const Y_RANGE = Y_MAX - Y_MIN;
const GRID_VALS = [5000, 10000, 15000, 20000];

function vy(v: number) { return PAD.t + (1 - (v - Y_MIN) / Y_RANGE) * PH; }
function vx(i: number) { return PAD.l + (i / (monthlyData.length - 1)) * PW; }

const tithePts  = monthlyData.map((d, i) => ({ x: vx(i), y: vy(d.tithe)     }));
const offerPts  = monthlyData.map((d, i) => ({ x: vx(i), y: vy(d.offerings) }));
const bottomY   = PAD.t + PH;
const titheLine = tithePts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
const titheArea = titheLine + ` L${tithePts.at(-1)!.x.toFixed(1)},${bottomY} L${tithePts[0].x.toFixed(1)},${bottomY} Z`;
const offerLine = offerPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

// ── Top contributors ─────────────────────────────────────────────────────────
const memberTotals = mockTithePayments.reduce<Record<string, number>>((acc, p) => {
  acc[p.member_id] = (acc[p.member_id] ?? 0) + p.amount;
  return acc;
}, {});
const topContributors = Object.entries(memberTotals)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5)
  .map(([id, total]) => {
    const m = mockMembers.find((x) => x.id === id);
    return { name: m ? `${m.first_name} ${m.last_name}` : "Unknown", total, dept: m?.department_id ? departmentNames[m.department_id] : "" };
  });

const maxContrib = topContributors[0]?.total ?? 1;

// ── Department breakdown ─────────────────────────────────────────────────────
const activeByDept = mockMembers
  .filter((m) => m.status === "active")
  .reduce<Record<string, number>>((acc, m) => {
    const d = m.department_id ?? "other";
    acc[d] = (acc[d] ?? 0) + 1;
    return acc;
  }, {});

type Period = "monthly" | "quarterly" | "yearly";

export function ReportsPage() {
  const [period, setPeriod] = useState<Period>("monthly");

  const totalIncome  = monthlyData.reduce((s, d) => s + d.tithe + d.offerings, 0);
  const aprilIncome  = (monthlyData.at(-1)?.tithe ?? 0) + (monthlyData.at(-1)?.offerings ?? 0);
  const growthPct    = (((aprilIncome - ((monthlyData.at(-2)?.tithe ?? 0) + (monthlyData.at(-2)?.offerings ?? 0))) / ((monthlyData.at(-2)?.tithe ?? 0) + (monthlyData.at(-2)?.offerings ?? 0))) * 100).toFixed(1);

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
            { label: "Total Income (6mo)",   value: formatCurrency(totalIncome), Icon: BarChart3,     color: "text-amber-400",   bg: "bg-amber-400/10",   ring: "border-amber-400/20"   },
            { label: "April Total",          value: formatCurrency(aprilIncome), Icon: TrendingUp,    color: "text-emerald-400", bg: "bg-emerald-400/10", ring: "border-emerald-400/20" },
            { label: "Tithe Payers (Apr)",   value: "10",                        Icon: HandCoins,     color: "text-blue-400",    bg: "bg-blue-400/10",    ring: "border-blue-400/20"   },
            { label: "Active Members",       value: String(mockMembers.filter((m) => m.status === "active").length), Icon: Users, color: "text-rose-400", bg: "bg-rose-400/10", ring: "border-rose-400/20" },
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
                  <span className="font-semibold text-emerald-400">↑ {growthPct}%</span>
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
                  const y = vy(v);
                  return (
                    <g key={v}>
                      <line x1={PAD.l} y1={y} x2={VW - PAD.r} y2={y} stroke="#2E2840" strokeWidth={0.6} strokeDasharray="2,3" />
                      <text x={PAD.l - 6} y={y + 3.5} textAnchor="end" fontSize={7.5} fill="#5C5870">
                        {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      </text>
                    </g>
                  );
                })}
                {monthlyData.map((d, i) => {
                  const isLast = i === monthlyData.length - 1;
                  return (
                    <text key={d.month} x={vx(i)} y={VH - 5} textAnchor="middle" fontSize={8} fill={isLast ? "#FBBF24" : "#5C5870"} fontWeight={isLast ? "700" : "400"}>
                      {d.month}
                    </text>
                  );
                })}
                <path d={titheArea} fill="url(#rptTitheArea)" />
                <path d={titheLine} fill="none" stroke="url(#rptTitheLine)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                <path d={offerLine} fill="none" stroke="url(#rptOfferLine)" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
                {tithePts.slice(0, -1).map((p, i) => (
                  <circle key={`t${i}`} cx={p.x} cy={p.y} r={2.5} fill="#1C1828" stroke="#FBBF24" strokeWidth={1.2} strokeOpacity={0.5} />
                ))}
                {offerPts.slice(0, -1).map((p, i) => (
                  <circle key={`o${i}`} cx={p.x} cy={p.y} r={2.5} fill="#1C1828" stroke="#34D399" strokeWidth={1.2} strokeOpacity={0.5} />
                ))}
                <circle cx={tithePts.at(-1)!.x} cy={tithePts.at(-1)!.y} r={9} fill="#FBBF24" fillOpacity={0.12} />
                <circle cx={tithePts.at(-1)!.x} cy={tithePts.at(-1)!.y} r={4} fill="#FBBF24" />
                <circle cx={offerPts.at(-1)!.x} cy={offerPts.at(-1)!.y} r={8} fill="#34D399" fillOpacity={0.12} />
                <circle cx={offerPts.at(-1)!.x} cy={offerPts.at(-1)!.y} r={3.5} fill="#34D399" />
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
              {Object.entries(activeByDept)
                .sort(([, a], [, b]) => b - a)
                .map(([dept, count]) => {
                  const total = mockMembers.filter((m) => m.status === "active").length;
                  const pct   = Math.round((count / total) * 100);
                  return (
                    <div key={dept}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-(--color-muted) truncate mr-2">{departmentNames[dept] ?? dept}</span>
                        <span className="text-xs font-semibold text-white shrink-0">{count}</span>
                      </div>
                      <div className="h-1.5 bg-(--color-card2) rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </div>

        {/* Top contributors */}
        <div className="flex gap-4">
          <Card className="flex-1">
            <CardHeader className="px-5 py-3.5">
              <div className="flex items-center gap-2">
                <HandCoins size={13} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-white">Top Tithe Contributors — April</h2>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {topContributors.map((c, i) => (
                <div key={c.name} className="flex items-center gap-4 px-5 py-3.5 border-b border-(--color-border)/40 last:border-0 hover:bg-white/[0.018] transition-colors">
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
              ))}
            </CardContent>
          </Card>

          {/* Offerings breakdown */}
          <Card className="w-72 shrink-0">
            <CardHeader className="px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Church size={13} className="text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Offering Categories</h2>
              </div>
            </CardHeader>
            <CardContent className="px-5 pt-3 pb-5 space-y-3">
              {[
                { label: "General Offering", amount: 7030, pct: 72, dot: "bg-amber-400",   bar: "bg-amber-400"   },
                { label: "Thanksgiving",     amount: 850,  pct: 9,  dot: "bg-emerald-400", bar: "bg-emerald-400" },
                { label: "Building Fund",    amount: 1200, pct: 12, dot: "bg-blue-400",    bar: "bg-blue-400"    },
                { label: "Missions",         amount: 730,  pct: 7,  dot: "bg-rose-400",    bar: "bg-rose-400"    },
              ].map(({ label, amount, pct, dot, bar }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full inline-block shrink-0", dot)} />
                      <span className="text-xs text-(--color-muted) truncate">{label}</span>
                    </div>
                    <span className="text-xs font-semibold text-white shrink-0">{formatCurrency(amount)}</span>
                  </div>
                  <div className="h-1 bg-(--color-card2) rounded-full overflow-hidden">
                    <div className={cn("h-full", bar)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-(--color-border) flex items-center justify-between">
                <span className="text-xs text-(--color-muted)">Total</span>
                <span className="text-sm font-bold text-white">{formatCurrency(9810)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

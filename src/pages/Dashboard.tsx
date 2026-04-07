import { useState, useEffect } from "react";
import { tauriGetDashboardStats, tauriGetSyncPendingCount, type DashboardStats } from "@/lib/tauri";
import { useAppStore } from "@/stores/appStore";

import {
  Users,
  HandCoins,
  Church,
  HeartHandshake,
  CalendarDays,
  UserPlus,
  ArrowRight,
  TrendingUp,
  Download,
  ChevronDown,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/ui/StatCard";
import { IncomeChart } from "@/components/ui/IncomeChart";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Static data ─────────────────────────────────────────────────────────────

const activityGroups = [
  {
    label: "Today",
    items: [
      { name: "Kwame Mensah",  action: "Tithe recorded",        amount: 500,  time: "2 min ago", type: "tithe"    as const },
      { name: "Abena Boateng", action: "Welfare contribution",  amount: 200,  time: "1 hr ago",  type: "welfare"  as const },
      { name: "Kofi Asante",   action: "New member registered", amount: 0,    time: "3 hr ago",  type: "member"   as const },
    ],
  },
  {
    label: "Yesterday",
    items: [
      { name: "Sunday Service", action: "Offering recorded",    amount: 4250, time: "5:30 PM",   type: "offering" as const },
      { name: "Ama Owusu",      action: "Tithe recorded",       amount: 750,  time: "2:15 PM",   type: "tithe"    as const },
    ],
  },
];

const typeConfig = {
  tithe:    { Icon: HandCoins,      color: "text-amber-400",   bg: "bg-amber-400/10"   },
  welfare:  { Icon: HeartHandshake, color: "text-rose-400",    bg: "bg-rose-400/10"    },
  member:   { Icon: UserPlus,       color: "text-blue-400",    bg: "bg-blue-400/10"    },
  offering: { Icon: Church,         color: "text-emerald-400", bg: "bg-emerald-400/10" },
} as const;

const quickActions = [
  { label: "Record Tithe",    Icon: HandCoins,      color: "text-amber-400",   hover: "hover:border-amber-400/30   hover:bg-amber-400/5"   },
  { label: "Add Member",      Icon: Users,          color: "text-blue-400",    hover: "hover:border-blue-400/30    hover:bg-blue-400/5"    },
  { label: "Record Offering", Icon: Church,         color: "text-emerald-400", hover: "hover:border-emerald-400/30 hover:bg-emerald-400/5" },
  { label: "Welfare Entry",   Icon: HeartHandshake, color: "text-rose-400",    hover: "hover:border-rose-400/30    hover:bg-rose-400/5"    },
];

const monthProgress = [
  { label: "Tithe payers",         display: "142 / 248", pct: 57,  bar: "bg-amber-400"   },
  { label: "Welfare contributors", display: "98 / 248",  pct: 39,  bar: "bg-blue-400"    },
  { label: "Services recorded",    display: "4",         pct: 100, bar: "bg-emerald-400" },
];

// ─── Header actions ───────────────────────────────────────────────────────────

function DashboardActions() {
  const { setSyncStatus, syncStatus } = useAppStore();
const [stats, setStats] = useState<DashboardStats | null>(null);

useEffect(() => {
  tauriGetDashboardStats()
    .then(setStats)
    .catch(console.error);

  tauriGetSyncPendingCount()
    .then((pending) =>
      setSyncStatus({ ...syncStatus, pending })
    )
    .catch(console.error);
}, []);

  return (
    <div className="flex items-center gap-2">
      {/* Date range */}
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1828] border border-[#2E2840] text-xs text-[#8B879C] hover:text-white hover:border-[#3E3858] hover:bg-[#211D30] transition-all">
        <CalendarDays size={11} className="text-amber-400" />
        Apr 2026
        <ChevronDown size={10} />
      </button>
      {/* Export */}
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1828] border border-[#2E2840] text-xs text-[#8B879C] hover:text-white hover:border-[#3E3858] hover:bg-[#211D30] transition-all">
        <Download size={11} />
        Export
      </button>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Dashboard() {
  const dateStr = new Date().toLocaleDateString("en-GH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={dateStr}
        actions={<DashboardActions />}
      />

      <div className="p-6 space-y-4">

        {/* ── Performance summary bar ──────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 rounded-2xl bg-[#1C1828] border border-[#2E2840]">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="text-xs text-[#8B879C]">
              Grace Covenant Church · April 2026 overview
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <TrendingUp size={11} />
            12.4% income growth this month
          </div>
        </div>

        {/* ── KPI row ──────────────────────────────────────────────── */}
        {/*
          At xl (≥1280px): 5-col grid — Tithe is 2 cols (hero), others are 1 col each.
          Below xl: 2-col grid — all cards are standard size, tithe is first.
        */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          {/* Tithe — hero card, dominant revenue metric */}
          <StatCard
            label="Tithe — This Month"
            value={stats ? formatCurrency(stats.tithe_this_month) : "Loading…"}
            icon={HandCoins}
            color="gold"
            size="large"
            className="xl:col-span-2"
          />
          {/* Members — dimmed so financial cards dominate */}
          <StatCard
            label="Total Members"
            value={stats ? String(stats.total_members) : "—"}
            icon={Users}
            color="blue"
          />
          {/* Offerings */}
          <StatCard
            label="Offerings — Month"
            value={stats ? formatCurrency(stats.offerings_this_month) : "—"}
            icon={Church}
            color="green"
          />
          {/* Welfare */}
          <StatCard
            label="Welfare Fund"
            value={stats ? formatCurrency(stats.welfare_balance) : "—"}
            icon={HeartHandshake}
            color="rose"
            sub="Available balance"
          />
        </div>

        {/* ── Main area ────────────────────────────────────────────── */}
        <div className="flex gap-4 items-start">

          {/* Left panel */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Income chart */}
            <IncomeChart />

            {/* Recent activity */}
            <Card>
              <CardHeader className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
                  <button className="flex items-center gap-1 text-xs text-[#8B879C] hover:text-amber-400 transition-colors group">
                    View all
                    <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {activityGroups.map((group) => (
                  <div key={group.label}>
                    {/* Time group header */}
                    <div className="px-5 py-2 border-b border-[#2E2840]/50 bg-[#15121F]/40">
                      <span className="text-[10px] font-bold text-[#5E5A72] uppercase tracking-[0.14em]">
                        {group.label}
                      </span>
                    </div>

                    {group.items.map((item, i) => {
                      const { Icon, color, bg } = typeConfig[item.type];
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3.5 px-5 py-3.5 border-b border-[#2E2840]/30 last:border-0 hover:bg-white/[0.025] transition-colors group cursor-default"
                        >
                          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-white/5 transition-transform group-hover:scale-105", bg)}>
                            <Icon size={15} className={color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white leading-snug truncate">{item.name}</p>
                            <p className="text-xs text-[#8B879C]">{item.action}</p>
                          </div>
                          <div className="text-right shrink-0 min-w-[90px]">
                            {item.amount > 0 && (
                              <p className="text-sm font-semibold text-white">{formatCurrency(item.amount)}</p>
                            )}
                            <p className="text-xs text-[#9490A8]">{item.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── Right panel ──────────────────────────────────────────── */}
          <div className="w-[268px] shrink-0 space-y-3">

            {/* Quick Actions */}
            <Card>
              <CardHeader className="px-5 py-3.5">
                <h2 className="text-sm font-semibold text-white">Quick Actions</h2>
              </CardHeader>
              <CardContent className="px-4 pt-2.5 pb-4 space-y-2">
                {quickActions.map(({ label, Icon, color, hover }) => (
                  <button
                    key={label}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#211D30] border border-[#2E2840]",
                      "text-left transition-all duration-150 group cursor-pointer hover:-translate-y-px hover:shadow-md",
                      hover,
                    )}
                  >
                    <Icon size={14} className={color} />
                    <span className="flex-1 text-sm text-white">{label}</span>
                    <ArrowRight
                      size={12}
                      className="text-[#8B879C] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                    />
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* This Month */}
            <Card>
              <CardHeader className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <CalendarDays size={13} className="text-amber-400 shrink-0" />
                  <h2 className="text-sm font-semibold text-white">This Month</h2>
                </div>
              </CardHeader>
              <CardContent className="px-5 pt-3 pb-4 space-y-4">
                {monthProgress.map(({ label, display, pct, bar }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-[#8B879C] truncate mr-2">{label}</span>
                      <span className="text-xs font-semibold text-white shrink-0">{display}</span>
                    </div>
                    <div className="h-1.5 bg-[#211D30] rounded-full overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-700 rounded-full", bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10.5px] text-[#5E5A72] mt-1">{pct}% participation</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* April Breakdown */}
            <Card>
              <CardHeader className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <TrendingUp size={13} className="text-emerald-400 shrink-0" />
                  <h2 className="text-sm font-semibold text-white">April Breakdown</h2>
                </div>
              </CardHeader>
              <CardContent className="px-5 pt-3 pb-4 space-y-2.5">
                {[
                  { label: "Tithe",     amount: 18450, pct: 67, dot: "bg-amber-400",   bar: "bg-gradient-to-r from-amber-400 to-amber-400/60"   },
                  { label: "Offerings", amount: 9200,  pct: 33, dot: "bg-emerald-400", bar: "bg-gradient-to-r from-emerald-400 to-emerald-400/60" },
                ].map(({ label, amount, pct, dot, bar }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full inline-block shrink-0", dot)} />
                        <span className="text-xs text-[#8B879C]">{label}</span>
                      </div>
                      <span className="text-xs font-semibold text-white">GH₵{amount.toLocaleString()}</span>
                    </div>
                    <div className="h-1 bg-[#211D30] rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2.5 border-t border-[#2E2840]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#8B879C]">Total income</span>
                    <span className="text-sm font-bold text-white">GH₵27,650</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}

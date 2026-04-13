import { useState, useEffect, useMemo } from "react";
import {
  tauriGetDashboardStats,
  tauriGetSyncPendingCount,
  tauriGetTithePayments,
  tauriGetOfferings,
  tauriGetWelfareContributions,
  tauriGetMembers,
  type DashboardStats,
  type TithePayment,
  type Offering,
  type WelfareContribution,
  type MemberSummary,
} from "@/lib/tauri";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/ui/StatCard";
import { IncomeChart } from "@/components/ui/IncomeChart";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { RecordTitheModal } from "@/components/forms/RecordTitheModal";
import { AddMemberModal } from "@/components/forms/AddMemberModal";
import { RecordOfferingModal } from "@/components/forms/RecordOfferingModal";
import { RecordWelfareModal } from "@/components/forms/RecordWelfareModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (hrs  < 24) return `${hrs} hr ago`;
  // For older items: show time only (date shown separately in "Earlier" group)
  return new Date(isoStr).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
}

function formatActivityDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("en-GH", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityType = "tithe" | "welfare" | "offering";

interface ActivityItem {
  name:       string;
  action:     string;
  amount:     number;
  time:       string;
  date:       string;   // formatted date for "Earlier" group
  created_at: string;
  type:       ActivityType;
}

const typeConfig = {
  tithe:    { Icon: HandCoins,      color: "text-amber-400",   bg: "bg-amber-400/10"   },
  welfare:  { Icon: HeartHandshake, color: "text-rose-400",    bg: "bg-rose-400/10"    },
  member:   { Icon: UserPlus,       color: "text-blue-400",    bg: "bg-blue-400/10"    },
  offering: { Icon: Church,         color: "text-emerald-400", bg: "bg-emerald-400/10" },
} as const;

// quickActions is built inside the component so it can reference setters — see below

// monthProgress is built at render-time from live stats — no static values here

// ─── Header actions ───────────────────────────────────────────────────────────

function DashboardActions() {
  const navigate   = useNavigate();
  const now        = new Date();
  const monthLabel = now.toLocaleDateString("en-GH", { month: "short", year: "numeric" });
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1828] border border-[#2E2840] text-xs text-[#8B879C]">
        <CalendarDays size={11} className="text-[#9490A8]" />
        {monthLabel}
      </span>
      <button
        onClick={() => navigate("/export")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1828] border border-[#2E2840] text-xs text-[#8B879C] hover:text-white hover:border-[#3E3858] hover:bg-[#211D30] transition-all">
        <Download size={11} />
        Export
      </button>
    </div>
  );
}


// ─── Component ───────────────────────────────────────────────────────────────

export function Dashboard() {
  const { setSyncStatus, syncStatus } = useAppStore();
  const navigate = useNavigate();
  const [stats,         setStats]         = useState<DashboardStats | null>(null);
  const [recentTithe,   setRecentTithe]   = useState<TithePayment[]>([]);
  const [recentOffer,   setRecentOffer]   = useState<Offering[]>([]);
  const [recentWelfare, setRecentWelfare] = useState<WelfareContribution[]>([]);
  const [actMembers,    setActMembers]    = useState<MemberSummary[]>([]);

  // Quick action modal state
  const [titheOpen,   setTitheOpen]   = useState(false);
  const [memberOpen,  setMemberOpen]  = useState(false);
  const [offerOpen,   setOfferOpen]   = useState(false);
  const [welfareOpen, setWelfareOpen] = useState(false);

  const quickActions = [
    { label: "Record Tithe",    Icon: HandCoins,      color: "text-amber-400",   hover: "hover:border-amber-400/30   hover:bg-amber-400/5",   onClick: () => setTitheOpen(true)   },
    { label: "Add Member",      Icon: Users,          color: "text-blue-400",    hover: "hover:border-blue-400/30    hover:bg-blue-400/5",    onClick: () => setMemberOpen(true)  },
    { label: "Record Offering", Icon: Church,         color: "text-emerald-400", hover: "hover:border-emerald-400/30 hover:bg-emerald-400/5", onClick: () => setOfferOpen(true)   },
    { label: "Welfare Entry",   Icon: HeartHandshake, color: "text-rose-400",    hover: "hover:border-rose-400/30    hover:bg-rose-400/5",    onClick: () => setWelfareOpen(true) },
  ];

  function reload() {
    tauriGetDashboardStats().then(setStats).catch(console.error);
    tauriGetSyncPendingCount()
      .then((pending) => setSyncStatus({ ...syncStatus, pending }))
      .catch(console.error);
    Promise.all([
      tauriGetTithePayments(),
      tauriGetOfferings(),
      tauriGetWelfareContributions(),
      tauriGetMembers(),
    ])
      .then(([t, o, w, m]) => {
        setRecentTithe(t);
        setRecentOffer(o);
        setRecentWelfare(w);
        setActMembers(m);
      })
      .catch(console.error);
  }

  useEffect(() => { reload(); }, []);

  // ── Build activity items ────────────────────────────────────────────────────
  const activityGroups = useMemo(() => {
    const items: ActivityItem[] = [];

    recentTithe.forEach((t) => {
      const m = actMembers.find((x) => x.id === t.member_id);
      items.push({
        name:       m ? `${m.first_name} ${m.last_name}` : "Member",
        action:     "Tithe recorded",
        amount:     t.amount,
        time:       formatRelativeTime(t.created_at),
        date:       formatActivityDate(t.created_at),
        created_at: t.created_at,
        type:       "tithe",
      });
    });

    recentOffer.forEach((o) => {
      items.push({
        name:       o.service_type || "Service",
        action:     "Offering recorded",
        amount:     o.total_amount,
        time:       formatRelativeTime(o.created_at),
        date:       formatActivityDate(o.created_at),
        created_at: o.created_at,
        type:       "offering",
      });
    });

    recentWelfare.forEach((w) => {
      const m = actMembers.find((x) => x.id === w.member_id);
      items.push({
        name:       m ? `${m.first_name} ${m.last_name}` : "Member",
        action:     "Welfare contribution",
        amount:     w.amount,
        time:       formatRelativeTime(w.created_at),
        date:       formatActivityDate(w.created_at),
        created_at: w.created_at,
        type:       "welfare",
      });
    });

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const top = items.slice(0, 15);

    const todayStr     = new Date().toDateString();
    const yesterdayStr = new Date(Date.now() - 86_400_000).toDateString();

    const buckets: Record<string, ActivityItem[]> = {};
    top.forEach((item) => {
      const ds = new Date(item.created_at).toDateString();
      const label = ds === todayStr ? "Today" : ds === yesterdayStr ? "Yesterday" : "Earlier";
      (buckets[label] ??= []).push(item);
    });

    return (["Today", "Yesterday", "Earlier"] as const)
      .filter((l) => buckets[l]?.length)
      .map((l) => ({ label: l, items: buckets[l] }));
  }, [recentTithe, recentOffer, recentWelfare, actMembers]);

  // ── Derived live values ──────────────────────────────────────────────────────
  const titheAmt    = stats?.tithe_this_month      ?? 0;
  const offerAmt    = stats?.offerings_this_month  ?? 0;
  const totalAmt    = titheAmt + offerAmt;
  const tithePct    = totalAmt > 0 ? Math.round((titheAmt  / totalAmt) * 100) : 0;
  const offerPct    = totalAmt > 0 ? 100 - tithePct : 0;
  const totalMembers = stats?.total_members ?? 0;

  const monthProgress = stats
    ? [
        {
          label:   "Tithe payers",
          display: `${stats.tithe_payers_month} / ${totalMembers}`,
          pct:     totalMembers > 0
            ? Math.min(100, Math.round((stats.tithe_payers_month / totalMembers) * 100))
            : 0,
          bar: "bg-amber-400",
        },
        {
          label:   "Welfare contributors",
          display: `${stats.welfare_contributors_month} / ${totalMembers}`,
          pct:     totalMembers > 0
            ? Math.min(100, Math.round((stats.welfare_contributors_month / totalMembers) * 100))
            : 0,
          bar: "bg-blue-400",
        },
      ]
    : [];
  const dateStr = new Date().toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={dateStr}
        actions={<DashboardActions />}
      />

      <div className="p-6 space-y-4">

        {/* ── Live summary bar ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 rounded-2xl bg-[#1C1828] border border-[#2E2840]">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-[#8B879C]">
              {new Date().toLocaleDateString("en-GH", { month: "long", year: "numeric" })} overview
            </span>
          </div>
          {totalAmt > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-[#9490A8]">
              <TrendingUp size={11} />
              {formatCurrency(totalAmt)} total income this month
            </div>
          )}
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
                  <button
                    onClick={() => navigate("/reports")}
                    className="flex items-center gap-1 text-xs text-[#8B879C] hover:text-amber-400 transition-colors group"
                  >
                    View all
                    <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {activityGroups.length === 0 ? (
                  <div className="px-5 py-10 text-center text-xs text-[#9490A8]">
                    No recent activity.
                  </div>
                ) : activityGroups.map((group) => (
                  <div key={group.label}>
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
                          <div className="text-right shrink-0 min-w-[110px]">
                            {item.amount > 0 && (
                              <p className="text-sm font-semibold text-white">{formatCurrency(item.amount)}</p>
                            )}
                            <p className="text-xs text-[#9490A8]">{item.time}</p>
                            {group.label === "Earlier" && (
                              <p className="text-[10px] text-[#5E5A72] mt-0.5">{item.date}</p>
                            )}
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
                {quickActions.map(({ label, Icon, color, hover, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
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
                  { label: "Tithe",     amount: titheAmt, pct: tithePct, dot: "bg-amber-400",   bar: "bg-gradient-to-r from-amber-400 to-amber-400/60"   },
                  { label: "Offerings", amount: offerAmt, pct: offerPct, dot: "bg-emerald-400", bar: "bg-gradient-to-r from-emerald-400 to-emerald-400/60" },
                ].map(({ label, amount, pct, dot, bar }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full inline-block shrink-0", dot)} />
                        <span className="text-xs text-[#8B879C]">{label}</span>
                      </div>
                      <span className="text-xs font-semibold text-white">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-1 bg-[#211D30] rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2.5 border-t border-[#2E2840]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#8B879C]">Total income</span>
                    <span className="text-sm font-bold text-white">{formatCurrency(totalAmt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      <RecordTitheModal   open={titheOpen}   onClose={() => setTitheOpen(false)}   onSuccess={reload} />
      <AddMemberModal     open={memberOpen}  onClose={() => setMemberOpen(false)}  onSuccess={reload} />
      <RecordOfferingModal open={offerOpen}  onClose={() => setOfferOpen(false)}   onSuccess={reload} />
      <RecordWelfareModal open={welfareOpen} onClose={() => setWelfareOpen(false)} onSuccess={reload} />
    </div>
  );
}

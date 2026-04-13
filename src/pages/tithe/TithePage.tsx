import { useState, useMemo, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, HandCoins, Users, TrendingUp, AlertCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RecordTitheModal } from "@/components/forms/RecordTitheModal";
import { BulkTitheModal } from "@/components/forms/BulkTitheModal";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  tauriGetTithePayments, tauriGetMembers,
  type TithePayment, type MemberSummary,
} from "@/lib/tauri";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type PaymentMode = "cash" | "mobile_money" | "bank_transfer" | "cheque";
type PageTab = "paid" | "defaulters";

const modeConfig: Record<PaymentMode, { label: string; variant: "green" | "blue" | "gold" | "muted" }> = {
  cash:          { label: "Cash",          variant: "green" },
  mobile_money:  { label: "Mobile Money",  variant: "blue"  },
  bank_transfer: { label: "Bank Transfer", variant: "gold"  },
  cheque:        { label: "Cheque",        variant: "muted" },
};

export function TithePage() {
  const now = new Date();
  const [month,    setMonth]    = useState(now.getMonth());
  const [year,     setYear]     = useState(now.getFullYear());
  const [payments, setPayments] = useState<TithePayment[]>([]);
  const [members,  setMembers]  = useState<MemberSummary[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<PageTab>("paid");
  const [recordOpen,      setRecordOpen]      = useState(false);
  const [bulkOpen,        setBulkOpen]        = useState(false);
  const [prefillMemberId, setPrefillMemberId] = useState<string | undefined>();

  // Build member lookup map
  const memberMap = useMemo(() => {
    const m = new Map<string, MemberSummary>();
    for (const mem of members) m.set(mem.id, mem);
    return m;
  }, [members]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      tauriGetTithePayments(month + 1, year),
      tauriGetMembers(undefined, "active"),
    ])
      .then(([pmts, mems]) => { setPayments(pmts); setMembers(mems); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const totalAmount = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const payersCount = useMemo(() => new Set(payments.map((p) => p.member_id)).size, [payments]);
  const avgAmount   = payersCount > 0 ? totalAmount / payersCount : 0;

  // Defaulters: active members with no tithe payment this month
  const defaulters = useMemo(() => {
    const paidIds = new Set(payments.map((p) => p.member_id));
    return members.filter((m) => !paidIds.has(m.id));
  }, [members, payments]);

  function openRecordForMember(id: string) {
    setPrefillMemberId(id);
    setRecordOpen(true);
  }

  return (
    <div>
      <Header title="Tithe" subtitle="Record and track tithe payments" />
      <div className="p-6 space-y-4">

        {/* Navigator + action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-[#1C1828] border border-[#2E2840] rounded-xl p-1">
            <button onClick={prevMonth}
              className="p-1.5 rounded-lg text-[#9490A8] hover:text-white hover:bg-white/5 transition-all">
              <ChevronLeft size={14} />
            </button>
            <span className="px-4 py-1 text-sm font-semibold text-white min-w-[110px] text-center">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth}
              className="p-1.5 rounded-lg text-[#9490A8] hover:text-white hover:bg-white/5 transition-all">
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setBulkOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#211D30] border border-[#2E2840] text-white text-xs font-semibold hover:border-white/20 transition-colors">
              <Users size={13} /> Bulk Entry
            </button>
            <button onClick={() => { setPrefillMemberId(undefined); setRecordOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors">
              <HandCoins size={13} /> Record Tithe
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Collected",   value: formatCurrency(totalAmount), Icon: HandCoins,  color: "text-amber-400",   bg: "bg-amber-400/10",   ring: "border-amber-400/20"   },
            { label: "Payers This Month", value: String(payersCount),          Icon: Users,       color: "text-blue-400",    bg: "bg-blue-400/10",    ring: "border-blue-400/20"   },
            { label: "Average Amount",    value: formatCurrency(avgAmount),    Icon: TrendingUp,  color: "text-emerald-400", bg: "bg-emerald-400/10", ring: "border-emerald-400/20" },
          ].map(({ label, value, Icon, color, bg, ring }) => (
            <div key={label} className="bg-[#1C1828] border border-[#2E2840] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", bg, ring)}>
                  <Icon size={15} className={color} />
                </div>
                <p className="text-[11px] font-bold text-[#9490A8] uppercase tracking-wider">{label}</p>
              </div>
              <p className="text-2xl font-bold text-white leading-none">{value}</p>
            </div>
          ))}
        </div>

        {/* Tab selector */}
        <div className="flex items-center gap-1 bg-[#1C1828] border border-[#2E2840] rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("paid")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === "paid"
                ? "bg-amber-400/15 text-amber-400"
                : "text-[#9490A8] hover:text-white",
            )}
          >
            Paid ({payersCount})
          </button>
          <button
            onClick={() => setTab("defaulters")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
              tab === "defaulters"
                ? "bg-rose-400/15 text-rose-400"
                : "text-[#9490A8] hover:text-white",
            )}
          >
            {defaulters.length > 0 && (
              <AlertCircle size={11} className={tab === "defaulters" ? "text-rose-400" : "text-rose-400/60"} />
            )}
            Unpaid ({defaulters.length})
          </button>
        </div>

        {/* Paid tab */}
        {tab === "paid" && (
          <Card>
            <div className="px-5 py-3.5 border-b border-[#2E2840] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                {MONTHS[month]} {year} — Tithe Records
              </h2>
              <span className="text-xs text-[#9490A8]">{payments.length} entries</span>
            </div>

            {loading ? (
              <div className="px-5 py-12 text-center text-[#9490A8] text-sm">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2E2840]/60">
                      {["Member","Amount","Date","Mode","Reference","Received By"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-[#9490A8] uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-[#9490A8] text-sm">
                          No tithe records for {MONTHS[month]} {year}.
                        </td>
                      </tr>
                    ) : payments.map((p) => {
                      const mode = modeConfig[p.payment_mode as PaymentMode] ?? { label: p.payment_mode, variant: "muted" as const };
                      const date = new Date(p.payment_date).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
                      const mem  = memberMap.get(p.member_id);
                      const memberLabel = mem
                        ? `${mem.first_name} ${mem.last_name}`
                        : p.member_id.slice(0, 8) + "…";
                      const memberNo = mem?.member_no ?? "";
                      return (
                        <tr key={p.id} className="border-b border-[#2E2840]/40 last:border-0 hover:bg-white/[0.018] transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-medium text-white">{memberLabel}</p>
                            {memberNo && <p className="text-xs text-[#9490A8] font-mono mt-0.5">{memberNo}</p>}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm font-semibold text-amber-400">{formatCurrency(p.amount)}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-[#9490A8]">{date}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={mode.variant}>{mode.label}</Badge>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-mono text-xs text-[#9490A8]">{p.reference_no ?? "—"}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-white/80">{p.received_by}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {payments.length > 0 && (
              <div className="px-5 py-3.5 border-t border-[#2E2840] flex items-center justify-between">
                <p className="text-xs text-[#9490A8]">{payments.length} records</p>
                <p className="text-sm font-bold text-white">
                  Total: <span className="text-amber-400">{formatCurrency(totalAmount)}</span>
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Defaulters tab */}
        {tab === "defaulters" && (
          <Card>
            <div className="px-5 py-3.5 border-b border-[#2E2840] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {MONTHS[month]} {year} — Unpaid Members
                </h2>
                <p className="text-xs text-[#9490A8] mt-0.5">Active members with no tithe recorded this month</p>
              </div>
              <span className="text-xs text-rose-400 font-semibold">{defaulters.length} unpaid</span>
            </div>

            {loading ? (
              <div className="px-5 py-12 text-center text-[#9490A8] text-sm">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2E2840]/60">
                      {["Member","Member No","Department","Phone","Action"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-[#9490A8] uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {defaulters.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-emerald-400 text-sm">
                          All active members have paid their tithe for {MONTHS[month]} {year}!
                        </td>
                      </tr>
                    ) : defaulters.map((m) => (
                      <tr key={m.id} className="border-b border-[#2E2840]/40 last:border-0 hover:bg-white/[0.018] transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-white">{m.first_name} {m.last_name}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-[#9490A8]">{m.member_no}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-[#9490A8]">{m.department_id ?? "—"}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-[#9490A8]">{m.phone ?? "—"}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => openRecordForMember(m.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold hover:bg-amber-400/20 transition-all"
                          >
                            <HandCoins size={11} /> Record
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

      </div>

      <RecordTitheModal
        open={recordOpen}
        onClose={() => { setRecordOpen(false); setPrefillMemberId(undefined); }}
        onSuccess={load}
        prefillMemberId={prefillMemberId}
      />
      <BulkTitheModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}

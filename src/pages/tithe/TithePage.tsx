import { useState, useMemo, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, HandCoins, Users, TrendingUp } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RecordTitheModal } from "@/components/forms/RecordTitheModal";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { tauriGetTithePayments, type TithePayment } from "@/lib/tauri";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type PaymentMode = "cash" | "mobile_money" | "bank_transfer" | "cheque";

const modeConfig: Record<PaymentMode, { label: string; variant: "green" | "blue" | "gold" | "muted" }> = {
  cash:          { label: "Cash",          variant: "green" },
  mobile_money:  { label: "Mobile Money",  variant: "blue"  },
  bank_transfer: { label: "Bank Transfer", variant: "gold"  },
  cheque:        { label: "Cheque",        variant: "muted" },
};

export function TithePage() {
  const now = new Date();
  const [month, setMonth]       = useState(now.getMonth());
  const [year,  setYear]        = useState(now.getFullYear());
  const [payments, setPayments] = useState<TithePayment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [recordOpen, setRecordOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    tauriGetTithePayments(month + 1, year)
      .then(setPayments)
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

          <button onClick={() => setRecordOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors">
            <HandCoins size={13} /> Record Tithe
          </button>
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

        {/* Table */}
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
                    {["Member ID","Amount","Date","Mode","Reference","Received By"].map((h) => (
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
                    return (
                      <tr key={p.id} className="border-b border-[#2E2840]/40 last:border-0 hover:bg-white/[0.018] transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-[#9490A8]">{p.member_id.slice(0, 8)}…</span>
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
      </div>

      <RecordTitheModal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
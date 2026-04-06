import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, HandCoins, Users, TrendingUp } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { mockTithePayments, mockMembers } from "@/lib/mockData";
import type { PaymentMode } from "@/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const paymentModeConfig: Record<PaymentMode, { label: string; variant: "green" | "blue" | "gold" | "muted" }> = {
  cash:          { label: "Cash",          variant: "green" },
  mobile_money:  { label: "Mobile Money",  variant: "blue"  },
  bank_transfer: { label: "Bank Transfer", variant: "gold"  },
  cheque:        { label: "Cheque",        variant: "muted" },
};

const memberMap = Object.fromEntries(mockMembers.map((m) => [m.id, `${m.first_name} ${m.last_name}`]));

export function TithePage() {
  const [month, setMonth] = useState(3); // 0-indexed (April = 3)
  const [year,  setYear]  = useState(2026);

  const payments = useMemo(() =>
    mockTithePayments.filter(
      (p) => p.period_month === month + 1 && p.period_year === year
    ),
    [month, year]
  );

  const totalAmount  = payments.reduce((s, p) => s + p.amount, 0);
  const payersCount  = new Set(payments.map((p) => p.member_id)).size;
  const avgAmount    = payersCount > 0 ? totalAmount / payersCount : 0;

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <div>
      <Header title="Tithe" subtitle="Record and track tithe payments" />

      <div className="p-6 space-y-4">
        {/* Month navigator + action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-(--color-card) border border-(--color-border) rounded-xl p-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-(--color-muted) hover:text-white hover:bg-white/5 transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-4 py-1 text-sm font-semibold text-white min-w-[110px] text-center">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-(--color-muted) hover:text-white hover:bg-white/5 transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors">
            <HandCoins size={13} />
            Record Tithe
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Collected",  value: formatCurrency(totalAmount), Icon: HandCoins,   color: "text-amber-400",   bg: "bg-amber-400/10",   ring: "border-amber-400/20"   },
            { label: "Payers This Month", value: String(payersCount),         Icon: Users,        color: "text-blue-400",    bg: "bg-blue-400/10",    ring: "border-blue-400/20"   },
            { label: "Average Amount",   value: formatCurrency(avgAmount),   Icon: TrendingUp,   color: "text-emerald-400", bg: "bg-emerald-400/10", ring: "border-emerald-400/20" },
          ].map(({ label, value, Icon, color, bg, ring }) => (
            <div key={label} className="bg-(--color-card) border border-(--color-border) rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", bg, ring)}>
                  <Icon size={15} className={color} />
                </div>
                <p className="text-[11px] font-bold text-(--color-muted) uppercase tracking-wider">{label}</p>
              </div>
              <p className="text-2xl font-bold text-white leading-none">{value}</p>
            </div>
          ))}
        </div>

        {/* Payments table */}
        <Card>
          <div className="px-5 py-3.5 border-b border-(--color-border) flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              {MONTHS[month]} {year} — Tithe Records
            </h2>
            <span className="text-xs text-(--color-muted)">{payments.length} entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-(--color-border)/60">
                  {["Member", "Amount", "Date", "Mode", "Reference", "Received By"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-(--color-muted) uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-(--color-muted) text-sm">
                      No tithe records for {MONTHS[month]} {year}.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const mode = paymentModeConfig[p.payment_mode];
                    const date = new Date(p.payment_date).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
                    return (
                      <tr key={p.id} className="border-b border-(--color-border)/40 last:border-0 hover:bg-white/[0.018] transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-white">{memberMap[p.member_id] ?? "Unknown"}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-semibold text-amber-400">{formatCurrency(p.amount)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-(--color-muted)">{date}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={mode.variant}>{mode.label}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-(--font-mono) text-xs text-(--color-muted)">{p.reference_no ?? "—"}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-white/80">{p.received_by}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {payments.length > 0 && (
            <div className="px-5 py-3.5 border-t border-(--color-border) flex items-center justify-between">
              <p className="text-xs text-(--color-muted)">{payments.length} records</p>
              <p className="text-sm font-bold text-white">
                Total: <span className="text-amber-400">{formatCurrency(totalAmount)}</span>
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

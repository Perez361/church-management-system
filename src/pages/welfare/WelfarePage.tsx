import { HeartHandshake, Plus, TrendingUp, ArrowDownLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { mockWelfareContributions, mockMembers } from "@/lib/mockData";
import type { PaymentMode } from "@/types";

const paymentModeConfig: Record<PaymentMode, { label: string; variant: "green" | "blue" | "gold" | "muted" }> = {
  cash:          { label: "Cash",          variant: "green" },
  mobile_money:  { label: "Mobile Money",  variant: "blue"  },
  bank_transfer: { label: "Bank Transfer", variant: "gold"  },
  cheque:        { label: "Cheque",        variant: "muted" },
};

const memberMap = Object.fromEntries(mockMembers.map((m) => [m.id, `${m.first_name} ${m.last_name}`]));

const FUND_BALANCE    = 5800;
const RECEIVED_MONTH  = mockWelfareContributions
  .filter((c) => c.contribution_date.startsWith("2026-04"))
  .reduce((s, c) => s + c.amount, 0);
const DISBURSED_MONTH = 850; // mock

export function WelfarePage() {
  return (
    <div>
      <Header title="Welfare" subtitle="Contributions and disbursements" />

      <div className="p-6 space-y-4">
        {/* Fund balance hero */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Available Balance",
              value: formatCurrency(FUND_BALANCE),
              Icon: HeartHandshake,
              color: "text-rose-400",
              bg: "bg-rose-400/10",
              ring: "border-rose-400/20",
              sub: "As of today",
            },
            {
              label: "Received — April",
              value: formatCurrency(RECEIVED_MONTH),
              Icon: TrendingUp,
              color: "text-emerald-400",
              bg: "bg-emerald-400/10",
              ring: "border-emerald-400/20",
              sub: `${mockWelfareContributions.filter((c) => c.contribution_date.startsWith("2026-04")).length} contributions`,
            },
            {
              label: "Disbursed — April",
              value: formatCurrency(DISBURSED_MONTH),
              Icon: ArrowDownLeft,
              color: "text-amber-400",
              bg: "bg-amber-400/10",
              ring: "border-amber-400/20",
              sub: "2 disbursements",
            },
          ].map(({ label, value, Icon, color, bg, ring, sub }) => (
            <div key={label} className="bg-(--color-card) border border-(--color-border) rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", bg, ring)}>
                  <Icon size={15} className={color} />
                </div>
                <p className="text-[11px] font-bold text-(--color-muted) uppercase tracking-wider">{label}</p>
              </div>
              <p className={cn("text-2xl font-bold leading-none", color)}>{value}</p>
              <p className="text-[11px] text-(--color-muted) mt-1.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Contributions table */}
        <Card>
          <div className="px-5 py-3.5 border-b border-(--color-border) flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Contributions</h2>
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors">
              <Plus size={12} />
              Record Contribution
            </button>
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
                {mockWelfareContributions.map((c) => {
                  const mode = paymentModeConfig[c.payment_mode];
                  const date = new Date(c.contribution_date).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
                  return (
                    <tr key={c.id} className="border-b border-(--color-border)/40 last:border-0 hover:bg-white/[0.018] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-rose-400/10 border border-rose-400/20 flex items-center justify-center shrink-0">
                            <HeartHandshake size={12} className="text-rose-400" />
                          </div>
                          <span className="text-sm font-medium text-white">{memberMap[c.member_id] ?? "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-semibold text-rose-400">{formatCurrency(c.amount)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-(--color-muted)">{date}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={mode.variant}>{mode.label}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-(--font-mono) text-xs text-(--color-muted)">{c.reference_no ?? "—"}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-white/80">{c.received_by}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3.5 border-t border-(--color-border) flex items-center justify-between">
            <p className="text-xs text-(--color-muted)">{mockWelfareContributions.length} contributions</p>
            <p className="text-sm font-bold text-white">
              Total: <span className="text-rose-400">
                {formatCurrency(mockWelfareContributions.reduce((s, c) => s + c.amount, 0))}
              </span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

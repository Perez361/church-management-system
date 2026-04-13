import { useState, useEffect, useCallback } from "react";
import { HeartHandshake, Plus, TrendingUp, ArrowDownLeft, Check, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RecordWelfareModal } from "@/components/forms/RecordWelfareModal";
import { RecordDisbursementModal } from "@/components/forms/RecordDisbursementModal";
import { cn, formatCurrency } from "@/lib/utils";
import {
  tauriGetWelfareContributions, tauriGetWelfareBalance,
  tauriGetWelfareDisbursements, tauriUpdateDisbursementStatus,
  type WelfareContribution, type WelfareDisbursement,
} from "@/lib/tauri";

type PaymentMode    = "cash" | "mobile_money" | "bank_transfer" | "cheque";
type ActiveTab      = "contributions" | "disbursements";
type DisbStatusFilter = "all" | "pending" | "approved" | "rejected";

const modeConfig: Record<PaymentMode, { label: string; variant: "green" | "blue" | "gold" | "muted" }> = {
  cash:          { label: "Cash",          variant: "green" },
  mobile_money:  { label: "Mobile Money",  variant: "blue"  },
  bank_transfer: { label: "Bank Transfer", variant: "gold"  },
  cheque:        { label: "Cheque",        variant: "muted" },
};

export function WelfarePage() {
  const [contributions,   setContributions]   = useState<WelfareContribution[]>([]);
  const [disbursements,   setDisbursements]   = useState<WelfareDisbursement[]>([]);
  const [balance,         setBalance]         = useState(0);
  const [loading,         setLoading]         = useState(true);
  const [activeTab,       setActiveTab]       = useState<ActiveTab>("contributions");
  const [disbFilter,      setDisbFilter]      = useState<DisbStatusFilter>("all");
  const [approvingId,     setApprovingId]     = useState<string | null>(null);
  const [recordContribOpen, setRecordContribOpen] = useState(false);
  const [recordDisbOpen,    setRecordDisbOpen]    = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      tauriGetWelfareContributions(),
      tauriGetWelfareBalance(),
      tauriGetWelfareDisbursements(),
    ])
      .then(([contribs, bal, disbs]) => {
        setContributions(contribs);
        setBalance(bal);
        setDisbursements(disbs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const receivedMonth = contributions
    .filter((c) => c.contribution_date.startsWith(monthPrefix))
    .reduce((s, c) => s + c.amount, 0);
  const totalAll     = contributions.reduce((s, c) => s + c.amount, 0);
  const totalDisbursed = disbursements.reduce((s, d) => s + d.amount, 0);

  return (
    <div>
      <Header title="Welfare" subtitle="Contributions and disbursements" />
      <div className="p-6 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Available Balance", value: formatCurrency(balance),        Icon: HeartHandshake, color: "text-rose-400",    bg: "bg-rose-400/10",    ring: "border-rose-400/20",   sub: "Contributions minus disbursements" },
            { label: "Received — Month",  value: formatCurrency(receivedMonth),  Icon: TrendingUp,     color: "text-emerald-400", bg: "bg-emerald-400/10", ring: "border-emerald-400/20", sub: `${contributions.filter(c => c.contribution_date.startsWith(monthPrefix)).length} contributions` },
            { label: "Total Collected",   value: formatCurrency(totalAll),       Icon: ArrowDownLeft,  color: "text-amber-400",   bg: "bg-amber-400/10",   ring: "border-amber-400/20",  sub: `${contributions.length} total records` },
            { label: "Total Disbursed",   value: formatCurrency(totalDisbursed), Icon: ArrowDownLeft,  color: "text-blue-400",    bg: "bg-blue-400/10",    ring: "border-blue-400/20",   sub: `${disbursements.length} disbursements` },
          ].map(({ label, value, Icon, color, bg, ring, sub }) => (
            <div key={label} className="bg-[#1C1828] border border-[#2E2840] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", bg, ring)}>
                  <Icon size={15} className={color} />
                </div>
                <p className="text-[11px] font-bold text-[#9490A8] uppercase tracking-wider">{label}</p>
              </div>
              <p className={cn("text-2xl font-bold leading-none", color)}>{value}</p>
              <p className="text-[11px] text-[#9490A8] mt-1.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#1C1828] border border-[#2E2840] rounded-xl p-1 w-fit">
          {(["contributions", "disbursements"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 capitalize",
                activeTab === tab
                  ? "bg-amber-400/15 text-amber-400"
                  : "text-[#9490A8] hover:text-white",
              )}
            >
              {tab}
              <span className={cn(
                "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                activeTab === tab ? "bg-amber-400/20 text-amber-400" : "bg-white/5 text-[#9490A8]",
              )}>
                {tab === "contributions" ? contributions.length : disbursements.length}
              </span>
            </button>
          ))}
        </div>

        {/* Contributions Table */}
        {activeTab === "contributions" && (
          <Card>
            <div className="px-5 py-3.5 border-b border-[#2E2840] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Contributions</h2>
              <button onClick={() => setRecordContribOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors">
                <Plus size={12} /> Record Contribution
              </button>
            </div>

            {loading ? (
              <div className="px-5 py-12 text-center text-[#9490A8] text-sm">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2E2840]/60">
                      {["Member ID","Amount","Date","Mode","Reference","Received By"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-[#9490A8] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contributions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-[#9490A8] text-sm">
                          No contributions yet. Record the first one →
                        </td>
                      </tr>
                    ) : contributions.map((c) => {
                      const mode = modeConfig[c.payment_mode as PaymentMode] ?? { label: c.payment_mode, variant: "muted" as const };
                      const date = new Date(c.contribution_date).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
                      return (
                        <tr key={c.id} className="border-b border-[#2E2840]/40 last:border-0 hover:bg-white/[0.018] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-rose-400/10 border border-rose-400/20 flex items-center justify-center shrink-0">
                                <HeartHandshake size={12} className="text-rose-400" />
                              </div>
                              <span className="font-mono text-xs text-[#9490A8]">{c.member_id.slice(0, 8)}…</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm font-semibold text-rose-400">{formatCurrency(c.amount)}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-[#9490A8]">{date}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={mode.variant}>{mode.label}</Badge>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-mono text-xs text-[#9490A8]">{c.reference_no ?? "—"}</span>
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
            )}

            {contributions.length > 0 && (
              <div className="px-5 py-3.5 border-t border-[#2E2840] flex items-center justify-between">
                <p className="text-xs text-[#9490A8]">{contributions.length} contributions</p>
                <p className="text-sm font-bold text-white">
                  Total: <span className="text-rose-400">{formatCurrency(totalAll)}</span>
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Disbursements Table */}
        {activeTab === "disbursements" && (
          <Card>
            <div className="px-5 py-3.5 border-b border-[#2E2840] flex items-center justify-between gap-3 flex-wrap">
              {/* Status filter pills */}
              <div className="flex items-center gap-1 bg-[#15121F] border border-[#2E2840] rounded-xl p-1">
                {(["all","pending","approved","rejected"] as DisbStatusFilter[]).map((f) => (
                  <button key={f} onClick={() => setDisbFilter(f)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all",
                      disbFilter === f ? "bg-amber-400/15 text-amber-400" : "text-[#9490A8] hover:text-white",
                    )}>
                    {f}
                    <span className={cn("ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                      disbFilter === f ? "bg-amber-400/20 text-amber-400" : "bg-white/5 text-[#9490A8]")}>
                      {f === "all" ? disbursements.length : disbursements.filter(d => d.status === f).length}
                    </span>
                  </button>
                ))}
              </div>
              <button onClick={() => setRecordDisbOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-rose-400 text-white text-xs font-semibold hover:bg-rose-300 transition-colors">
                <ArrowDownLeft size={12} /> Record Disbursement
              </button>
            </div>

            {loading ? (
              <div className="px-5 py-12 text-center text-[#9490A8] text-sm">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2E2840]/60">
                      {["Beneficiary","Amount","Date","Reason","Approved By","Status","Actions"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-[#9490A8] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = disbFilter === "all"
                        ? disbursements
                        : disbursements.filter(d => d.status === disbFilter);
                      if (filtered.length === 0) return (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center text-[#9490A8] text-sm">
                            No {disbFilter === "all" ? "" : disbFilter} disbursements found.
                          </td>
                        </tr>
                      );
                      return filtered.map((d) => {
                        const date = new Date(d.disbursement_date).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
                        const isBusy = approvingId === d.id;
                        async function updateStatus(status: "approved" | "rejected") {
                          setApprovingId(d.id);
                          try { await tauriUpdateDisbursementStatus(d.id, status); load(); }
                          catch (e) { console.error(e); }
                          finally { setApprovingId(null); }
                        }
                        return (
                          <tr key={d.id} className="border-b border-[#2E2840]/40 last:border-0 hover:bg-white/[0.018] transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-blue-400/10 border border-blue-400/20 flex items-center justify-center shrink-0">
                                  <ArrowDownLeft size={12} className="text-blue-400" />
                                </div>
                                <span className="font-mono text-xs text-[#9490A8]">{d.beneficiary_id.slice(0, 8)}…</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm font-semibold text-blue-400">{formatCurrency(d.amount)}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-[#9490A8]">{date}</span>
                            </td>
                            <td className="px-5 py-3.5 max-w-[200px]">
                              <span className="text-sm text-white/80 line-clamp-1">{d.reason}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm text-white/80">{d.approved_by}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <Badge variant={d.status === "approved" ? "green" : d.status === "rejected" ? "muted" : "gold"}>
                                {d.status}
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5">
                              {d.status === "pending" && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    disabled={isBusy}
                                    onClick={() => updateStatus("approved")}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-xs font-medium hover:bg-emerald-400/20 transition-colors disabled:opacity-50">
                                    <Check size={11} /> Approve
                                  </button>
                                  <button
                                    disabled={isBusy}
                                    onClick={() => updateStatus("rejected")}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-400/10 border border-rose-400/30 text-rose-400 text-xs font-medium hover:bg-rose-400/20 transition-colors disabled:opacity-50">
                                    <X size={11} /> Reject
                                  </button>
                                </div>
                              )}
                              {d.status !== "pending" && (
                                <span className="text-xs text-[#9490A8]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}

            {disbursements.length > 0 && (
              <div className="px-5 py-3.5 border-t border-[#2E2840] flex items-center justify-between">
                <p className="text-xs text-[#9490A8]">{disbursements.length} disbursements</p>
                <p className="text-sm font-bold text-white">
                  Total disbursed: <span className="text-blue-400">{formatCurrency(totalDisbursed)}</span>
                </p>
              </div>
            )}
          </Card>
        )}
      </div>

      <RecordWelfareModal
        open={recordContribOpen}
        onClose={() => setRecordContribOpen(false)}
        onSuccess={load}
      />

      <RecordDisbursementModal
        open={recordDisbOpen}
        onClose={() => setRecordDisbOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}

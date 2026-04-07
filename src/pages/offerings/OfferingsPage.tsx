import { useState, useMemo, useEffect, useCallback } from "react";
import { Church, Plus, Calendar } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { RecordOfferingModal } from "@/components/forms/RecordOfferingModal";
import { cn, formatCurrency } from "@/lib/utils";
import { tauriGetOfferings, type Offering } from "@/lib/tauri";

export function OfferingsPage() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading]     = useState(true);
  const [recordOpen, setRecordOpen] = useState(false);
  const [view, setView] = useState<"all" | "april" | "march">("all");

  const load = useCallback(() => {
    setLoading(true);
    tauriGetOfferings()
      .then(setOfferings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (view === "april") return offerings.filter((o) => o.service_date.startsWith("2026-04"));
    if (view === "march") return offerings.filter((o) => o.service_date.startsWith("2026-03"));
    return offerings;
  }, [offerings, view]);

  const grouped = useMemo(() => {
    const map = new Map<string, Offering[]>();
    for (const o of filtered) {
      if (!map.has(o.service_date)) map.set(o.service_date, []);
      map.get(o.service_date)!.push(o);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const aprilTotal   = offerings.filter((o) => o.service_date.startsWith("2026-04")).reduce((s, o) => s + o.total_amount, 0);
  const grandTotal   = offerings.reduce((s, o) => s + o.total_amount, 0);
  const aprilServices = new Set(offerings.filter((o) => o.service_date.startsWith("2026-04")).map((o) => o.service_date)).size;

  const catDots: Record<string, string> = {
    "General Offering": "bg-amber-400",
    "Thanksgiving":     "bg-emerald-400",
    "Building Fund":    "bg-blue-400",
    "Missions":         "bg-rose-400",
  };

  return (
    <div>
      <Header title="Offerings" subtitle="Service offering records" />
      <div className="p-6 space-y-4">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "April Total",    value: formatCurrency(aprilTotal),  color: "text-amber-400"   },
            { label: "Services (Apr)", value: String(aprilServices),        color: "text-blue-400"    },
            { label: "All Time Total", value: formatCurrency(grandTotal),   color: "text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#1C1828] border border-[#2E2840] rounded-2xl p-5">
              <p className="text-[11px] font-bold text-[#9490A8] uppercase tracking-wider mb-2">{label}</p>
              <p className={cn("text-2xl font-bold leading-none", color)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filter + action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-[#1C1828] border border-[#2E2840] rounded-xl p-1">
            {(["all","april","march"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 capitalize",
                  view === v ? "bg-amber-400/15 text-amber-400" : "text-[#9490A8] hover:text-white"
                )}>
                {v === "all" ? "All Time" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button onClick={() => setRecordOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors">
            <Plus size={13} /> Record Offering
          </button>
        </div>

        {/* Grouped cards */}
        {loading ? (
          <div className="py-16 text-center text-[#9490A8] text-sm">Loading…</div>
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-[#9490A8] text-sm">
              No offering records yet. Record your first offering →
            </CardContent>
          </Card>
        ) : grouped.map(([date, items]) => {
          const dateLabel  = new Date(date).toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
          const dayTotal   = items.reduce((s, o) => s + o.total_amount, 0);
          const serviceType = items[0]?.service_type ?? "";
          return (
            <Card key={date}>
              <CardHeader className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                      <Church size={14} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{serviceType}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Calendar size={10} className="text-[#9490A8]" />
                        <span className="text-[11px] text-[#9490A8]">{dateLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-[#9490A8] uppercase tracking-wider">Day Total</p>
                    <p className="text-base font-bold text-amber-400 mt-0.5">{formatCurrency(dayTotal)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {items.map((o, i) => (
                  <div key={o.id}
                    className={cn(
                      "flex items-center justify-between px-5 py-3 hover:bg-white/[0.018] transition-colors",
                      i < items.length - 1 && "border-b border-[#2E2840]/40"
                    )}>
                    <div className="flex items-center gap-2.5">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", catDots[o.category] ?? "bg-white/30")} />
                      <span className="text-sm text-white/80">{o.category}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{formatCurrency(o.total_amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <RecordOfferingModal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
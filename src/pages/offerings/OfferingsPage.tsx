import { useState, useMemo, useEffect, useCallback } from "react";
import { Church, Plus, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { RecordOfferingModal } from "@/components/forms/RecordOfferingModal";
import { cn, formatCurrency } from "@/lib/utils";
import { tauriGetOfferings, type Offering } from "@/lib/tauri";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const catDots: Record<string, string> = {
  "General Offering": "bg-amber-400",
  "Thanksgiving":     "bg-emerald-400",
  "Building Fund":    "bg-blue-400",
  "Missions":         "bg-rose-400",
  "Welfare":          "bg-purple-400",
  "Special":          "bg-cyan-400",
};

export function OfferingsPage() {
  const now = new Date();
  const [month, setMonth]   = useState(now.getMonth());       // 0-based
  const [year,  setYear]    = useState(now.getFullYear());
  const [view,  setView]    = useState<"month" | "all">("month");

  const [allOfferings,   setAllOfferings]   = useState<Offering[]>([]);
  const [monthOfferings, setMonthOfferings] = useState<Offering[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [recordOpen,     setRecordOpen]     = useState(false);

  // Month bounds: "YYYY-MM-01" → "YYYY-MM-{last}"
  const fromDate = useMemo(() => {
    const m = String(month + 1).padStart(2, "0");
    return `${year}-${m}-01`;
  }, [month, year]);

  const toDate = useMemo(() => {
    const last = new Date(year, month + 1, 0).getDate();
    const m    = String(month + 1).padStart(2, "0");
    return `${year}-${m}-${last}`;
  }, [month, year]);

  const loadMonth = useCallback(() => {
    return tauriGetOfferings(fromDate, toDate);
  }, [fromDate, toDate]);

  const loadAll = useCallback(() => {
    return tauriGetOfferings();
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([loadMonth(), loadAll()])
      .then(([month, all]) => {
        setMonthOfferings(month);
        setAllOfferings(all);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [loadMonth, loadAll]);

  useEffect(() => { load(); }, [load]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const displayed = view === "month" ? monthOfferings : allOfferings;

  const grouped = useMemo(() => {
    const map = new Map<string, Offering[]>();
    for (const o of displayed) {
      if (!map.has(o.service_date)) map.set(o.service_date, []);
      map.get(o.service_date)!.push(o);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [displayed]);

  const monthTotal    = monthOfferings.reduce((s, o) => s + o.total_amount, 0);
  const monthServices = new Set(monthOfferings.map((o) => o.service_date)).size;
  const allTotal      = allOfferings.reduce((s, o) => s + o.total_amount, 0);

  const monthLabel = `${MONTHS[month]} ${year}`;

  return (
    <div>
      <Header title="Offerings" subtitle="Service offering records" />
      <div className="p-6 space-y-4">

        {/* Navigator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#1C1828] border border-[#2E2840] rounded-xl p-1">
              <button onClick={prevMonth}
                className="p-1.5 rounded-lg text-[#9490A8] hover:text-white hover:bg-white/5 transition-all">
                <ChevronLeft size={14} />
              </button>
              <span className="px-4 py-1 text-sm font-semibold text-white min-w-[120px] text-center">
                {monthLabel}
              </span>
              <button onClick={nextMonth}
                className="p-1.5 rounded-lg text-[#9490A8] hover:text-white hover:bg-white/5 transition-all">
                <ChevronRight size={14} />
              </button>
            </div>

            {/* All time toggle */}
            <div className="flex items-center gap-1 bg-[#1C1828] border border-[#2E2840] rounded-xl p-1">
              {(["month", "all"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                    view === v ? "bg-amber-400/15 text-amber-400" : "text-[#9490A8] hover:text-white",
                  )}>
                  {v === "month" ? monthLabel : "All Time"}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setRecordOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors">
            <Plus size={13} /> Record Offering
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: `${monthLabel} Total`,    value: formatCurrency(monthTotal),  color: "text-amber-400"   },
            { label: `Services (${MONTHS[month]})`, value: String(monthServices), color: "text-blue-400"    },
            { label: "All Time Total",          value: formatCurrency(allTotal),   color: "text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#1C1828] border border-[#2E2840] rounded-2xl p-5">
              <p className="text-[11px] font-bold text-[#9490A8] uppercase tracking-wider mb-2">{label}</p>
              <p className={cn("text-2xl font-bold leading-none", color)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Grouped cards */}
        {loading ? (
          <div className="py-16 text-center text-[#9490A8] text-sm">Loading…</div>
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-[#9490A8] text-sm">
              No offering records for {view === "month" ? monthLabel : "any period"}.
            </CardContent>
          </Card>
        ) : grouped.map(([date, items]) => {
          const dateLabel   = new Date(date + "T00:00:00").toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
          const dayTotal    = items.reduce((s, o) => s + o.total_amount, 0);
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
                      i < items.length - 1 && "border-b border-[#2E2840]/40",
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

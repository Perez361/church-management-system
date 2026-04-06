import { useState, useMemo } from "react";
import { Church, Plus, Calendar } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { mockOfferings } from "@/lib/mockData";

const categoryColors: Record<string, { variant: "gold" | "green" | "blue" | "rose" | "muted"; dot: string }> = {
  "General Offering": { variant: "gold",  dot: "bg-amber-400"   },
  "Thanksgiving":     { variant: "green", dot: "bg-emerald-400" },
  "Building Fund":    { variant: "blue",  dot: "bg-blue-400"    },
  "Missions":         { variant: "rose",  dot: "bg-rose-400"    },
};

function defaultCategory(cat: string) {
  return categoryColors[cat] ?? { variant: "muted" as const, dot: "bg-white/30" };
}

export function OfferingsPage() {
  const [view, setView] = useState<"all" | "april" | "march">("all");

  // Group offerings by service_date
  const grouped = useMemo(() => {
    const filtered = view === "april"
      ? mockOfferings.filter((o) => o.service_date.startsWith("2026-04"))
      : view === "march"
        ? mockOfferings.filter((o) => o.service_date.startsWith("2026-03"))
        : mockOfferings;

    const map = new Map<string, typeof mockOfferings>();
    for (const o of filtered) {
      const key = o.service_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    // Sort by date descending
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [view]);

  const grandTotal = mockOfferings.reduce((s, o) => s + o.total_amount, 0);
  const aprilTotal = mockOfferings.filter((o) => o.service_date.startsWith("2026-04")).reduce((s, o) => s + o.total_amount, 0);

  return (
    <div>
      <Header title="Offerings" subtitle="Service offering records" />

      <div className="p-6 space-y-4">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "April Total",    value: formatCurrency(aprilTotal),  color: "text-amber-400",   bg: "bg-amber-400/10",   ring: "border-amber-400/20"  },
            { label: "Services (Apr)", value: "3",                         color: "text-blue-400",    bg: "bg-blue-400/10",    ring: "border-blue-400/20"   },
            { label: "All Time Total", value: formatCurrency(grandTotal),  color: "text-emerald-400", bg: "bg-emerald-400/10", ring: "border-emerald-400/20" },
          ].map(({ label, value, color, bg, ring }) => (
            <div key={label} className="bg-(--color-card) border border-(--color-border) rounded-2xl p-5">
              <p className="text-[11px] font-bold text-(--color-muted) uppercase tracking-wider mb-2">{label}</p>
              <p className={cn("text-2xl font-bold leading-none", color)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Period filter + action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-(--color-card) border border-(--color-border) rounded-xl p-1">
            {(["all", "april", "march"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 capitalize",
                  view === v ? "bg-amber-400/15 text-amber-400" : "text-(--color-muted) hover:text-white"
                )}
              >
                {v === "all" ? "All Time" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors">
            <Plus size={13} />
            Record Offering
          </button>
        </div>

        {/* Grouped service cards */}
        <div className="space-y-3">
          {grouped.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-(--color-muted) text-sm">
                No offering records found.
              </CardContent>
            </Card>
          )}
          {grouped.map(([date, items]) => {
            const dateLabel = new Date(date).toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
            const dayTotal  = items.reduce((s, o) => s + o.total_amount, 0);
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
                          <Calendar size={10} className="text-(--color-muted)" />
                          <span className="text-[11px] text-(--color-muted)">{dateLabel}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-(--color-muted) uppercase tracking-wider">Day Total</p>
                      <p className="text-base font-bold text-amber-400 mt-0.5">{formatCurrency(dayTotal)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {items.map((o, i) => {
                    const cat = defaultCategory(o.category);
                    return (
                      <div
                        key={o.id}
                        className={cn(
                          "flex items-center justify-between px-5 py-3 transition-colors hover:bg-white/[0.018]",
                          i < items.length - 1 && "border-b border-(--color-border)/40"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", cat.dot)} />
                          <span className="text-sm text-white/80">{o.category}</span>
                        </div>
                        <span className="text-sm font-semibold text-white">{formatCurrency(o.total_amount)}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

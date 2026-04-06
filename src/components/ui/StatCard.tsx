import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  color?: "gold" | "green" | "blue" | "rose";
  trend?: { value: string; up: boolean };
  /** "large" gives the card a hero treatment — bigger value, gradient bg, progress accent */
  size?: "default" | "large";
  className?: string;
}

const palette = {
  gold: {
    icon:        "text-amber-400",
    bg:          "bg-amber-400/10",
    ring:        "border-amber-400/20",
    accent:      "from-amber-400/70 via-amber-400/30 to-transparent",
    glow:        "bg-amber-400",
    hover:       "hover:border-amber-400/40",
    bar:         "from-amber-400 to-amber-400/20",
    heroBg:      "bg-gradient-to-br from-[#201B2D] to-[#1C1828]",
    heroBorder:  "border-amber-400/35",
    heroHover:   "hover:border-amber-400/55",
  },
  green: {
    icon:        "text-emerald-400",
    bg:          "bg-emerald-400/10",
    ring:        "border-emerald-400/20",
    accent:      "from-emerald-400/50 via-emerald-400/20 to-transparent",
    glow:        "bg-emerald-400",
    hover:       "hover:border-emerald-400/35",
    bar:         "from-emerald-400 to-emerald-400/20",
    heroBg:      "bg-gradient-to-br from-[#1A2020] to-[#1C1828]",
    heroBorder:  "border-emerald-400/30",
    heroHover:   "hover:border-emerald-400/50",
  },
  blue: {
    icon:        "text-blue-400",
    bg:          "bg-blue-400/10",
    ring:        "border-blue-400/20",
    accent:      "from-blue-400/45 via-blue-400/20 to-transparent",
    glow:        "bg-blue-400",
    hover:       "hover:border-blue-400/35",
    bar:         "from-blue-400 to-blue-400/20",
    heroBg:      "bg-gradient-to-br from-[#1A1C28] to-[#1C1828]",
    heroBorder:  "border-blue-400/30",
    heroHover:   "hover:border-blue-400/50",
  },
  rose: {
    icon:        "text-rose-400",
    bg:          "bg-rose-400/10",
    ring:        "border-rose-400/20",
    accent:      "from-rose-400/45 via-rose-400/20 to-transparent",
    glow:        "bg-rose-400",
    hover:       "hover:border-rose-400/35",
    bar:         "from-rose-400 to-rose-400/20",
    heroBg:      "bg-gradient-to-br from-[#201A1C] to-[#1C1828]",
    heroBorder:  "border-rose-400/30",
    heroHover:   "hover:border-rose-400/50",
  },
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "gold",
  trend,
  size = "default",
  className,
}: StatCardProps) {
  const p = palette[color];

  /* ── Hero / Large Variant ─────────────────────────────────────────── */
  if (size === "large") {
    return (
      <div
        className={cn(
          "relative overflow-hidden border rounded-2xl p-5 xl:p-6 cursor-default min-w-0",
          "transition-all duration-200 hover:-translate-y-px hover:shadow-xl",
          p.heroBg,
          p.heroBorder,
          p.heroHover,
          className,
        )}
      >
        {/* Top accent strip — thicker & more vivid */}
        <div className={cn("absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r", p.accent)} />

        {/* Radial glow blob */}
        <div className={cn("absolute -top-10 -left-10 w-48 h-48 rounded-full blur-3xl opacity-[0.13]", p.glow)} />

        {/* Row 1: icon + label left | trend badge right */}
        <div className="relative flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border shrink-0", p.bg, p.ring)}>
              <Icon size={19} className={p.icon} />
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-[#9490A8] uppercase tracking-[0.12em]">
                {label}
              </p>
              {sub && <p className="text-[11px] text-[#6B6880] mt-0.5">{sub}</p>}
            </div>
          </div>

          {trend && (
            <div className="flex flex-col items-end gap-0.5 shrink-0 ml-2">
              <span
                className={cn(
                  "inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full",
                  trend.up
                    ? "text-emerald-400 bg-emerald-400/10"
                    : "text-rose-400   bg-rose-400/10",
                )}
              >
                {trend.up ? "↑" : "↓"} {trend.value}
              </span>
              <span className="text-[10px] text-[#6B6880]">vs last month</span>
            </div>
          )}
        </div>

        {/* Value — responsive: 2xl on small, 40px on xl */}
        <p className="relative text-[28px] xl:text-[42px] font-bold text-white leading-none tracking-tight truncate">
          {value}
        </p>

        {/* Progress accent bar */}
        <div className="relative mt-5 h-[3px] bg-[#2E2840]/80 rounded-full overflow-hidden">
          <div className={cn("h-full w-4/5 rounded-full bg-gradient-to-r", p.bar)} />
        </div>
      </div>
    );
  }

  /* ── Default Variant ──────────────────────────────────────────────── */
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#1C1828] border border-[#2E2840] rounded-2xl p-5 min-w-0 cursor-default",
        "transition-all duration-200 hover:bg-[#201C2E] hover:-translate-y-px hover:shadow-lg hover:border-white/10",
        p.hover,
        className,
      )}
    >
      {/* Top accent strip */}
      <div className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r", p.accent)} />

      {/* Radial glow */}
      <div className={cn("absolute -top-6 -left-6 w-24 h-24 rounded-full blur-2xl opacity-[0.08]", p.glow)} />

      {/* Icon + trend */}
      <div className="relative flex items-start justify-between mb-4">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0", p.bg, p.ring)}>
          <Icon size={15} className={p.icon} />
        </div>

        {trend && (
          <div className="flex flex-col items-end gap-0.5">
            <span
              className={cn(
                "inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full",
                trend.up
                  ? "text-emerald-400 bg-emerald-400/10"
                  : "text-rose-400   bg-rose-400/10",
              )}
            >
              {trend.up ? "↑" : "↓"} {trend.value}
            </span>
            <span className="text-[10px] text-[#6B6880]">vs last month</span>
          </div>
        )}
      </div>

      {/* Label */}
      <p className="relative text-[10px] font-bold text-[#9490A8] uppercase tracking-[0.12em] mb-2 truncate">
        {label}
      </p>

      {/* Value */}
      <p className="relative text-xl font-bold text-white leading-none tracking-tight truncate">
        {value}
      </p>

      {sub && <p className="relative text-[11px] text-[#6B6880] mt-2">{sub}</p>}
    </div>
  );
}

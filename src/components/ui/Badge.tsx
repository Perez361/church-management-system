import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "gold" | "green" | "blue" | "rose" | "muted";
  className?: string;
}

const variants = {
  gold: "bg-amber-400/10 text-amber-400 border-amber-400/30",
  green: "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
  blue: "bg-blue-400/10 text-blue-400 border-blue-400/30",
  rose: "bg-rose-400/10 text-rose-400 border-rose-400/30",
  muted: "bg-white/5 text-white/50 border-white/10",
};

export function Badge({ children, variant = "muted", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
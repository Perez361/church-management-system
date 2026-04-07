import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants = {
  primary:   "bg-amber-400 text-black hover:bg-amber-300 font-semibold",
  secondary: "bg-[#211D30] border border-[#2E2840] text-white hover:border-white/20",
  danger:    "bg-rose-400/10 border border-rose-400/30 text-rose-400 hover:bg-rose-400/20",
  ghost:     "text-[#9490A8] hover:text-white hover:bg-white/5",
};
const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
};

export function Button({
  variant = "primary", size = "md", loading, icon,
  children, disabled, className, ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center transition-all duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant], sizes[size], className
      )}
    >
      {loading
        ? <Loader2 size={14} className="animate-spin shrink-0" />
        : icon && <span className="shrink-0">{icon}</span>
      }
      {children}
    </button>
  );
}
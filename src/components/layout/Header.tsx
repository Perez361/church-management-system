import { Bell, Search } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

interface HeaderProps {
  title: string;
  subtitle?: string;
  /** Optional controls rendered between the title and the search bar */
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { syncStatus } = useAppStore();

  return (
    <header className="w-full flex items-center justify-between gap-4 px-6 h-16 border-b border-[#2E2840] bg-[#15121F]/90 backdrop-blur-md sticky top-0 z-10">
      {/* Left — title */}
      <div className="shrink-0">
        <h1 className="text-base font-bold text-white tracking-tight leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-[#9490A8] mt-0.5 leading-none">{subtitle}</p>
        )}
      </div>

      {/* Centre — optional page actions */}
      {actions && (
        <div className="flex items-center gap-2 flex-1">
          {actions}
        </div>
      )}

      {/* Right — search + notifications */}
      <div className="flex items-center gap-3 bg-[#1C1828] border border-[#2E2840] rounded-xl px-2 py-1.5 hover:border-[#3E3858] transition-colors shrink-0">
        {/* Search */}
        <label className="flex items-center gap-2 cursor-text">
          <Search size={13} className="text-[#9490A8] shrink-0" />
          <input
            type="text"
            placeholder="Quick search…"
            className="bg-transparent text-sm text-white placeholder-[#9490A8]/70 outline-none w-36"
          />
          <kbd className="hidden sm:inline-flex items-center text-[9px] text-[#9490A8]/50 border border-[#2E2840] rounded px-1 py-0.5 font-mono">
            ⌘K
          </kbd>
        </label>

        {/* Divider */}
        <div className="w-px h-4 bg-[#2E2840]" />

        {/* Notifications */}
        <button className="relative w-7 h-7 rounded-lg flex items-center justify-center text-[#9490A8] hover:text-white hover:bg-white/5 transition-colors">
          <Bell size={14} />
          {syncStatus.pending > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 text-[8px] text-black font-bold flex items-center justify-center">
              {syncStatus.pending}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

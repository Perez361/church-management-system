import { useState, useRef, useEffect } from "react";
import { Bell, Search, CheckCheck, X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const notifIcon: Record<AppNotification["type"], React.ReactNode> = {
  success: <CheckCircle  size={13} className="text-emerald-400 shrink-0 mt-0.5" />,
  error:   <AlertCircle  size={13} className="text-rose-400    shrink-0 mt-0.5" />,
  warning: <AlertTriangle size={13} className="text-amber-400  shrink-0 mt-0.5" />,
  info:    <Info          size={13} className="text-blue-400   shrink-0 mt-0.5" />,
};

function formatNotifTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "short" });
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { syncStatus, notifications, markAllRead, dismissNotification, loadNotifications, clearAllNotifications } = useAppStore();
  const [bellOpen, setBellOpen]   = useState(false);
  const [search,   setSearch]     = useState("");
  const bellRef                   = useRef<HTMLDivElement>(null);
  const navigate                  = useNavigate();

  // Load persisted notifications once on mount
  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const unread = notifications.filter((n) => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!bellOpen) return;
    function onOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [bellOpen]);

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && search.trim()) {
      navigate(`/members?search=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  }

  function openBell() {
    setBellOpen((v) => !v);
  }

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
        {/* Quick search */}
        <label className="flex items-center gap-2 cursor-text">
          <Search size={13} className="text-[#9490A8] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search members… ↵"
            className="bg-transparent text-sm text-white placeholder-[#9490A8]/70 outline-none w-36"
          />
          <kbd className="hidden sm:inline-flex items-center text-[9px] text-[#9490A8]/50 border border-[#2E2840] rounded px-1 py-0.5 font-mono">
            ↵
          </kbd>
        </label>

        <div className="w-px h-4 bg-[#2E2840]" />

        {/* Notifications bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={openBell}
            className="relative w-7 h-7 rounded-lg flex items-center justify-center text-[#9490A8] hover:text-white hover:bg-white/5 transition-colors"
          >
            <Bell size={14} className={cn(bellOpen && "text-amber-400")} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 text-[8px] text-black font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
            {unread === 0 && syncStatus.pending > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400/70" />
            )}
          </button>

          {/* Dropdown */}
          {bellOpen && (
            <div
              className={cn(
                "absolute right-0 top-full mt-2 w-80",
                "bg-[#1C1828] border border-[#2E2840] rounded-2xl shadow-2xl shadow-black/60",
                "z-50 overflow-hidden",
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2E2840]">
                <span className="text-sm font-semibold text-white">Notifications</span>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[10px] text-[#9490A8] hover:text-amber-400 transition-colors"
                  >
                    <CheckCheck size={11} /> Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-[#2E2840]/50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-[#9490A8]">
                    No notifications yet
                  </div>
                ) : notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-2.5 px-4 py-3 transition-colors group",
                      n.read ? "opacity-60" : "bg-white/[0.02]",
                    )}
                  >
                    {notifIcon[n.type]}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white leading-snug">{n.title}</p>
                      <p className="text-[11px] text-[#9490A8] leading-snug mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-[#5E5A72] mt-1">{formatNotifTime(n.time)}</p>
                    </div>
                    <button
                      onClick={() => dismissNotification(n.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-[#9490A8] hover:text-white transition-all shrink-0 mt-0.5"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2.5 border-t border-[#2E2840]">
                  <button
                    onClick={clearAllNotifications}
                    className="text-[10px] text-[#9490A8] hover:text-rose-400 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

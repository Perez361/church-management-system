import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, HandCoins, Church,
  HeartHandshake, BarChart3, Settings, ChevronLeft,
  ChevronRight, Cross,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/members", icon: Users, label: "Members" },
  { to: "/tithe", icon: HandCoins, label: "Tithe" },
  { to: "/offerings", icon: Church, label: "Offerings" },
  { to: "/welfare", icon: HeartHandshake, label: "Welfare" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
];

const bottomItems = [
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, user, syncStatus } = useAppStore();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[#15121F] border-r border-[#2E2840] transition-all duration-300 shrink-0",
        sidebarCollapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 shrink-0 border-b border-[#2E2840]">
        <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.15)]">
          <Cross size={13} className="text-amber-400" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-bold text-white leading-tight truncate tracking-tight">
              Church CMS
            </div>
            <div className="text-[10px] text-[#9490A8]/70 truncate">Management System</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group",
                isActive
                  ? "bg-amber-400/10 text-amber-400"
                  : "text-[#9490A8] hover:text-white hover:bg-white/5"
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Left accent bar */}
                {isActive && (
                  <span className="absolute left-0 inset-y-1.5 w-0.5 rounded-r-full bg-amber-400" />
                )}
                <Icon
                  size={17}
                  className={cn(
                    "shrink-0",
                    isActive ? "text-amber-400" : "text-[#9490A8] group-hover:text-white"
                  )}
                />
                {!sidebarCollapsed && (
                  <span className="truncate font-medium">{label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sync indicator */}
      {!sidebarCollapsed && (
        <div className="px-3 py-2.5 mx-2 mb-2 rounded-xl bg-[#1C1828] border border-[#2E2840]">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                syncStatus.is_online ? "bg-emerald-400" : "bg-rose-400"
              )}
            />
            <span className="text-[11px] text-[#9490A8] flex-1 truncate">
              {syncStatus.is_online ? "Online" : "Offline"}
              {syncStatus.last_synced && (
                <span className="text-[#9490A8]/50">
                  {" · "}
                  {new Date(syncStatus.last_synced).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </span>
            {syncStatus.pending > 0 && (
              <span className="text-[10px] text-amber-400 font-medium shrink-0">
                {syncStatus.pending}↑
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bottom */}
      <div className="px-2 pb-2 space-y-0.5 border-t border-[#2E2840] pt-2">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150",
                isActive ? "bg-amber-400/10 text-amber-400" : "text-[#9490A8] hover:text-white hover:bg-white/5"
              )
            }
          >
            <Icon size={17} className="shrink-0" />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {/* User */}
        {user && (
          <div className={cn("flex items-center gap-3 px-3 py-2.5 mt-1", sidebarCollapsed && "justify-center")}>
            <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">
              {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <div className="text-xs font-medium text-white truncate">{user.name}</div>
                <div className="text-[10px] text-[#9490A8] capitalize">{user.role}</div>
              </div>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center py-2 rounded-xl text-[#9490A8] hover:text-white hover:bg-white/5 transition-all"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, HandCoins,
  HeartHandshake, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/",          icon: LayoutDashboard, label: "Home"    },
  { to: "/members",   icon: Users,           label: "Members" },
  { to: "/tithe",     icon: HandCoins,       label: "Tithe"   },
  { to: "/welfare",   icon: HeartHandshake,  label: "Welfare" },
  { to: "/settings",  icon: Settings,        label: "Settings"},
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#15121F] border-t border-[#2E2840]"
         style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex h-14">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                isActive ? "text-amber-400" : "text-[#9490A8] hover:text-white",
              )
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

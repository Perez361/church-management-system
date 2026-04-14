import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0E0C1A]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 pb-14 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
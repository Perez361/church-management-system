import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, UserPlus, MoreHorizontal, Filter } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AddMemberModal } from "@/components/forms/AddMemberModal";
import { cn } from "@/lib/utils";
import { tauriGetMembers, type MemberSummary } from "@/lib/tauri";
import { departmentNames } from "@/lib/mockData";

type MemberStatus = "active" | "inactive" | "transferred";
type FilterStatus = MemberStatus | "all";

const statusConfig: Record<MemberStatus, { label: string; variant: "green" | "muted" | "blue" }> = {
  active:      { label: "Active",      variant: "green" },
  inactive:    { label: "Inactive",    variant: "muted" },
  transferred: { label: "Transferred", variant: "blue"  },
};

const filterTabs: { key: FilterStatus; label: string }[] = [
  { key: "all",         label: "All"         },
  { key: "active",      label: "Active"      },
  { key: "inactive",    label: "Inactive"    },
  { key: "transferred", label: "Transferred" },
];

export function MembersPage() {
  const [members, setMembers]       = useState<MemberSummary[]>([]);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<FilterStatus>("all");
  const [addOpen, setAddOpen]       = useState(false);
  const [loading, setLoading]       = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    tauriGetMembers(
      search.trim() || undefined,
      statusFilter === "all" ? undefined : statusFilter
    )
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({
    all:         members.length,
    active:      members.filter((m) => m.status === "active").length,
    inactive:    members.filter((m) => m.status === "inactive").length,
    transferred: members.filter((m) => m.status === "transferred").length,
  }), [members]);

  return (
    <div>
      <Header title="Members" subtitle="Manage church member records" />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Status tabs */}
          <div className="flex items-center gap-1 bg-[#1C1828] border border-[#2E2840] rounded-xl p-1">
            {filterTabs.map(({ key, label }) => (
              <button key={key} onClick={() => setStatus(key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                  statusFilter === key
                    ? "bg-amber-400/15 text-amber-400"
                    : "text-[#9490A8] hover:text-white"
                )}>
                {label}
                <span className={cn(
                  "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                  statusFilter === key
                    ? "bg-amber-400/20 text-amber-400"
                    : "bg-white/5 text-[#9490A8]"
                )}>
                  {statusFilter === "all" ? members.length : counts[key as FilterStatus]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <label className="flex items-center gap-2 bg-[#1C1828] border border-[#2E2840] rounded-xl px-3 py-2 hover:border-white/20 transition-colors cursor-text">
              <Search size={13} className="text-[#9490A8] shrink-0" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or ID…"
                className="bg-transparent text-sm text-white placeholder-[#9490A8]/60 outline-none w-48" />
            </label>

            <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1C1828] border border-[#2E2840] text-[#9490A8] hover:text-white hover:border-white/20 transition-all text-xs">
              <Filter size={13} /> Filter
            </button>

            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors">
              <UserPlus size={13} /> Add Member
            </button>
          </div>
        </div>

        {/* Table */}
        <Card>
          {loading ? (
            <div className="px-5 py-16 text-center text-[#9490A8] text-sm">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2E2840]">
                    {["Member","ID","Gender","Phone","Department","Joined","Status",""].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-[#9490A8] uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-[#9490A8] text-sm">
                        No members found. Add your first member →
                      </td>
                    </tr>
                  ) : members.map((m) => {
                    const initials = `${m.first_name[0]}${m.last_name[0]}`;
                    const st       = statusConfig[m.status as MemberStatus] ?? statusConfig.inactive;
                    const dept     = m.department_id ? (departmentNames[m.department_id] ?? m.department_id) : "—";
                    const joined   = new Date(m.membership_date).toLocaleDateString("en-GH", {
                      day: "numeric", month: "short", year: "numeric"
                    });
                    return (
                      <tr key={m.id}
                        className="border-b border-[#2E2840]/50 last:border-0 hover:bg-white/[0.018] transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white leading-snug">
                                {m.first_name} {m.last_name}
                              </p>
                              {m.email && <p className="text-[11px] text-[#9490A8]">{m.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-[#9490A8]">{m.member_no}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-[#9490A8] capitalize">{m.gender}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-white/80">{m.phone ?? "—"}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-white/80">{dept}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-[#9490A8]">{joined}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#9490A8] hover:text-white hover:bg-white/5 transition-all">
                            <MoreHorizontal size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-5 py-3 border-t border-[#2E2840] flex items-center justify-between">
            <p className="text-xs text-[#9490A8]">
              <span className="text-white font-medium">{members.length}</span> members
            </p>
          </div>
        </Card>
      </div>

      <AddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
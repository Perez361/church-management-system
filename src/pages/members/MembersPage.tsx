import { useState, useMemo } from "react";
import { Search, UserPlus, MoreHorizontal, Filter } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { mockMembers, departmentNames } from "@/lib/mockData";
import type { MemberStatus } from "@/types";

const statusConfig: Record<MemberStatus, { label: string; variant: "green" | "muted" | "blue" }> = {
  active:      { label: "Active",      variant: "green" },
  inactive:    { label: "Inactive",    variant: "muted" },
  transferred: { label: "Transferred", variant: "blue"  },
};

type FilterStatus = MemberStatus | "all";

const filterTabs: { key: FilterStatus; label: string }[] = [
  { key: "all",         label: "All"         },
  { key: "active",      label: "Active"      },
  { key: "inactive",    label: "Inactive"    },
  { key: "transferred", label: "Transferred" },
];

export function MembersPage() {
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<FilterStatus>("all");

  const filtered = useMemo(() => {
    return mockMembers.filter((m) => {
      const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
      const matchSearch =
        !search ||
        fullName.includes(search.toLowerCase()) ||
        m.member_no.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const counts = useMemo(() => ({
    all:         mockMembers.length,
    active:      mockMembers.filter((m) => m.status === "active").length,
    inactive:    mockMembers.filter((m) => m.status === "inactive").length,
    transferred: mockMembers.filter((m) => m.status === "transferred").length,
  }), []);

  return (
    <div>
      <Header title="Members" subtitle="Manage church member records" />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1 bg-(--color-card) border border-(--color-border) rounded-xl p-1">
            {filterTabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatus(key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                  statusFilter === key
                    ? "bg-amber-400/15 text-amber-400"
                    : "text-(--color-muted) hover:text-white"
                )}
              >
                {label}
                <span className={cn(
                  "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                  statusFilter === key ? "bg-amber-400/20 text-amber-400" : "bg-white/5 text-(--color-muted)"
                )}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <label className="flex items-center gap-2 bg-(--color-card) border border-(--color-border) rounded-xl px-3 py-2 hover:border-white/20 transition-colors cursor-text">
              <Search size={13} className="text-(--color-muted) shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or ID…"
                className="bg-transparent text-sm text-white placeholder-[#9490A8]/60 outline-none w-48"
              />
            </label>

            <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-(--color-card) border border-(--color-border) text-(--color-muted) hover:text-white hover:border-white/20 transition-all text-xs">
              <Filter size={13} />
              Filter
            </button>

            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors">
              <UserPlus size={13} />
              Add Member
            </button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-(--color-border)">
                  {["Member", "ID", "Gender", "Phone", "Department", "Joined", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[10px] font-bold text-(--color-muted) uppercase tracking-wider first:pl-5"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-(--color-muted) text-sm">
                      No members match your search.
                    </td>
                  </tr>
                ) : (
                  filtered.map((member) => {
                    const initials = `${member.first_name[0]}${member.last_name[0]}`;
                    const status   = statusConfig[member.status];
                    const dept     = member.department_id ? (departmentNames[member.department_id] ?? member.department_id) : "—";
                    const joined   = new Date(member.membership_date).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });

                    return (
                      <tr
                        key={member.id}
                        className="border-b border-(--color-border)/50 last:border-0 hover:bg-white/[0.018] transition-colors group"
                      >
                        {/* Name + avatar */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white leading-snug">
                                {member.first_name} {member.last_name}
                              </p>
                              {member.email && (
                                <p className="text-[11px] text-(--color-muted)">{member.email}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Member no */}
                        <td className="px-5 py-3.5">
                          <span className="font-(--font-mono) text-xs text-(--color-muted)">{member.member_no}</span>
                        </td>

                        {/* Gender */}
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-(--color-muted) capitalize">{member.gender}</span>
                        </td>

                        {/* Phone */}
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-white/80">{member.phone ?? "—"}</span>
                        </td>

                        {/* Department */}
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-white/80">{dept}</span>
                        </td>

                        {/* Joined */}
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-(--color-muted)">{joined}</span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-(--color-muted) hover:text-white hover:bg-white/5 transition-all">
                            <MoreHorizontal size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-(--color-border) flex items-center justify-between">
            <p className="text-xs text-(--color-muted)">
              Showing <span className="text-white font-medium">{filtered.length}</span> of <span className="text-white font-medium">{mockMembers.length}</span> members
            </p>
            <div className="flex items-center gap-1">
              {[1].map((p) => (
                <button key={p} className="w-7 h-7 rounded-lg bg-amber-400/10 text-amber-400 text-xs font-semibold">
                  {p}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

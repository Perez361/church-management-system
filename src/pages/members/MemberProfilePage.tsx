import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, HandCoins, Pencil, CalendarDays, Phone, Mail,
  MapPin, User, Users, Calendar, Plus, Trash2, CheckCircle,
  HeartHandshake,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { EditMemberModal } from "@/components/forms/EditMemberModal";
import { RecordTitheModal } from "@/components/forms/RecordTitheModal";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  tauriGetMember, tauriGetTithePayments, tauriGetMemberEvents,
  tauriCreateMemberEvent, tauriDeleteMemberEvent, tauriUpdateMember,
  tauriGetWelfareContributions,
  type Member, type TithePayment, type MemberEvent, type WelfareContribution,
} from "@/lib/tauri";
import type { MemberSummary } from "@/lib/tauri";
import { departmentNames } from "@/lib/mockData";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_VARIANTS: Record<string, "green" | "muted" | "blue"> = {
  active:      "green",
  inactive:    "muted",
  transferred: "blue",
};

const EVENT_TYPES = [
  "baptism", "confirmation", "marriage", "first_communion",
  "dedication", "transfer_in", "transfer_out", "deceased",
];

const EVENT_ICONS: Record<string, string> = {
  marriage:    "💍",
  deceased:    "🕊️",
  baptism:     "✝",
  confirmation:"🙏",
  transfer_in: "→",
  transfer_out:"←",
  dedication:  "★",
  first_communion: "✦",
};

function fmt(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" });
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-[#2E2840]/50 last:border-0">
      <span className="text-xs text-[#9490A8] w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-white">{value || "—"}</span>
    </div>
  );
}

// ── Add Event Modal ──────────────────────────────────────────────────────────

interface AddEventModalProps {
  memberId: string;
  open: boolean;
  onClose: () => void;
  onSaved: (eventType: string) => void;
}

const EVENT_OPTIONS = EVENT_TYPES.map((t) => ({
  value: t,
  label: t.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "),
}));

function AddEventModal({ memberId, open, onClose, onSaved }: AddEventModalProps) {
  const [eventType,  setEventType]  = useState(EVENT_TYPES[0]);
  const [eventDate,  setEventDate]  = useState(new Date().toISOString().slice(0, 10));
  const [spouseName, setSpouseName] = useState("");
  const [notes,      setNotes]      = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  function reset() {
    setEventType(EVENT_TYPES[0]);
    setEventDate(new Date().toISOString().slice(0, 10));
    setSpouseName("");
    setNotes("");
    setError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      // For marriage events, prepend spouse name to notes
      let finalNotes = notes.trim() || undefined;
      if (eventType === "marriage" && spouseName.trim()) {
        finalNotes = `Married to: ${spouseName.trim()}${notes.trim() ? `\n${notes.trim()}` : ""}`;
      }
      await tauriCreateMemberEvent({
        member_id:  memberId,
        event_type: eventType,
        event_date: eventDate,
        notes:      finalNotes,
      });
      onSaved(eventType);
      reset();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Add Lifecycle Event" width="sm">
      <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
        {error && (
          <div className="px-4 py-3 rounded-xl bg-rose-400/10 border border-rose-400/30 text-rose-400 text-sm">{error}</div>
        )}
        <FormField label="Event Type" required>
          <Select value={eventType} onChange={(e) => setEventType(e.target.value)} options={EVENT_OPTIONS} />
        </FormField>
        <FormField label="Date" required>
          <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </FormField>
        {eventType === "marriage" && (
          <FormField label="Spouse Name" required>
            <Input
              value={spouseName}
              onChange={(e) => setSpouseName(e.target.value)}
              placeholder="Full name of spouse"
            />
          </FormField>
        )}
        {eventType === "deceased" && (
          <div className="px-4 py-3 rounded-xl bg-rose-400/10 border border-rose-400/20 text-rose-400 text-xs">
            Saving this event will automatically set the member's status to <strong>Inactive</strong>.
          </div>
        )}
        <FormField label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={eventType === "marriage" ? "Optional additional notes…" : "Optional notes…"}
          />
        </FormField>
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#2E2840]">
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="submit" loading={saving} icon={<CheckCircle size={14} />}>Save Event</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function MemberProfilePage() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();

  const [member,        setMember]        = useState<Member | null>(null);
  const [payments,      setPayments]      = useState<TithePayment[]>([]);
  const [events,        setEvents]        = useState<MemberEvent[]>([]);
  const [welfare,       setWelfare]       = useState<WelfareContribution[]>([]);
  const [loading,       setLoading]       = useState(true);

  const [editOpen,     setEditOpen]     = useState(false);
  const [titheOpen,    setTitheOpen]    = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [deletingEvt,  setDeletingEvt]  = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [mem, pmts, evts, wlf] = await Promise.all([
        tauriGetMember(id),
        tauriGetTithePayments(undefined, undefined, id),
        tauriGetMemberEvents(id),
        tauriGetWelfareContributions(id),
      ]);
      setMember(mem);
      setPayments(pmts);
      setEvents(evts);
      setWelfare(wlf);
    } catch {
      navigate("/members");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  async function deleteEvent(eventId: string) {
    setDeletingEvt(eventId);
    try {
      await tauriDeleteMemberEvent(eventId);
      setEvents((evs) => evs.filter((e) => e.id !== eventId));
    } catch { /* ignore */ } finally {
      setDeletingEvt(null);
    }
  }

  async function handleEventSaved(eventType: string) {
    if (eventType === "deceased") {
      // Auto-mark as inactive
      try {
        await tauriUpdateMember(id!, { status: "inactive" });
      } catch { /* ignore */ }
    }
    load();
  }

  if (loading) {
    return (
      <div>
        <Header title="Member Profile" />
        <div className="p-6 text-center text-[#9490A8] text-sm py-20">Loading…</div>
      </div>
    );
  }

  if (!member) return null;

  const initials    = `${member.first_name[0]}${member.last_name[0]}`;
  const dept        = member.department_id ? (departmentNames[member.department_id] ?? member.department_id) : "—";
  const statusVar   = STATUS_VARIANTS[member.status] ?? "muted";
  const totalTithe  = payments.reduce((s, p) => s + p.amount, 0);
  const thisYear    = new Date().getFullYear();
  const titheYear   = payments.filter((p) => p.period_year === thisYear).reduce((s, p) => s + p.amount, 0);
  const totalWelfare = welfare.reduce((s, w) => s + w.amount, 0);

  const memberSummary: MemberSummary = {
    id:              member.id,
    member_no:       member.member_no,
    first_name:      member.first_name,
    last_name:       member.last_name,
    gender:          member.gender,
    phone:           member.phone,
    email:           member.email,
    department_id:   member.department_id,
    membership_date: member.membership_date,
    status:          member.status,
  };

  return (
    <div>
      <Header title="Member Profile" subtitle={`${member.first_name} ${member.last_name}`} />

      <div className="p-6 space-y-5">

        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/members")}
            className="flex items-center gap-2 text-sm text-[#9490A8] hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Back to Members
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTitheOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-semibold hover:bg-amber-400/20 transition-all"
            >
              <HandCoins size={13} /> Record Tithe
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#211D30] border border-[#2E2840] text-white text-xs font-semibold hover:border-white/20 transition-all"
            >
              <Pencil size={13} /> Edit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">

          {/* ── Left: Identity ── */}
          <div className="col-span-1 space-y-4">
            <Card>
              <CardContent className="px-6 py-6 flex flex-col items-center text-center gap-4">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={initials}
                    className="w-60 h-62 rounded-4xl object-cover border-2 border-amber-400/30"
                  />
                ) : (
                  <div className="w-60 h-62 rounded-2xl bg-amber-400/15 border-2 border-amber-400/30 flex items-center justify-center text-amber-400 text-5xl font-bold">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-base font-bold text-white">{member.first_name} {member.last_name}</p>
                  <p className="text-xs font-mono text-[#9490A8] mt-0.5">{member.member_no}</p>
                </div>
                <Badge variant={statusVar}>{member.status}</Badge>
              </CardContent>
            </Card>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "All-time Tithe",  value: formatCurrency(totalTithe),  color: "text-amber-400"   },
                { label: `${thisYear} Tithe`, value: formatCurrency(titheYear),  color: "text-emerald-400" },
                { label: "Tithe Payments",  value: String(payments.length),     color: "text-blue-400"    },
                { label: "Welfare Contrib", value: formatCurrency(totalWelfare), color: "text-rose-400"    },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#1C1828] border border-[#2E2840] rounded-xl p-3 text-center">
                  <p className={cn("text-lg font-bold leading-none", color)}>{value}</p>
                  <p className="text-[10px] text-[#9490A8] mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Details ── */}
          <div className="col-span-2 space-y-4">

            {/* Personal details */}
            <Card>
              <CardHeader className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <User size={13} className="text-[#9490A8]" />
                  <h3 className="text-sm font-semibold text-white">Personal Details</h3>
                </div>
              </CardHeader>
              <CardContent className="px-5 py-2">
                <InfoRow label="Full Name"       value={`${member.first_name} ${member.last_name}`} />
                <InfoRow label="Gender"          value={member.gender?.charAt(0).toUpperCase() + member.gender?.slice(1)} />
                <InfoRow label="Date of Birth"   value={fmt(member.date_of_birth)} />
                <InfoRow label="Membership Date" value={fmt(member.membership_date)} />
              </CardContent>
            </Card>

            {/* Contact & Ministry */}
            <Card>
              <CardHeader className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-[#9490A8]" />
                  <h3 className="text-sm font-semibold text-white">Contact & Ministry</h3>
                </div>
              </CardHeader>
              <CardContent className="px-5 py-2">
                <div className="flex items-center gap-2 py-3 border-b border-[#2E2840]/50">
                  <Phone size={12} className="text-[#9490A8] shrink-0" />
                  <span className="text-xs text-[#9490A8] w-28 shrink-0">Phone</span>
                  <span className="text-sm text-white">{member.phone ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 py-3 border-b border-[#2E2840]/50">
                  <Mail size={12} className="text-[#9490A8] shrink-0" />
                  <span className="text-xs text-[#9490A8] w-28 shrink-0">Email</span>
                  <span className="text-sm text-white">{member.email ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 py-3 border-b border-[#2E2840]/50">
                  <MapPin size={12} className="text-[#9490A8] shrink-0" />
                  <span className="text-xs text-[#9490A8] w-28 shrink-0">Address</span>
                  <span className="text-sm text-white">{member.address ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 py-3">
                  <Users size={12} className="text-[#9490A8] shrink-0" />
                  <span className="text-xs text-[#9490A8] w-28 shrink-0">Department</span>
                  <span className="text-sm text-white">{dept}</span>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* ── Tithe history ── */}
        <Card>
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center gap-2">
              <HandCoins size={13} className="text-[#9490A8]" />
              <h3 className="text-sm font-semibold text-white">Tithe History</h3>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2E2840]/60">
                  {["Amount", "Date", "Period", "Mode", "Reference"].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10px] font-bold text-[#9490A8] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-[#9490A8] text-sm">
                      No tithe payments recorded.
                    </td>
                  </tr>
                ) : payments.slice(0, 12).map((p) => {
                  const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                  return (
                    <tr key={p.id} className="border-b border-[#2E2840]/40 last:border-0 hover:bg-white/[0.015] transition-colors">
                      <td className="px-5 py-3"><span className="text-sm font-semibold text-amber-400">{formatCurrency(p.amount)}</span></td>
                      <td className="px-5 py-3"><span className="text-sm text-[#9490A8]">{fmt(p.payment_date)}</span></td>
                      <td className="px-5 py-3"><span className="text-sm text-white/80">{MONTHS[p.period_month]} {p.period_year}</span></td>
                      <td className="px-5 py-3"><span className="text-sm text-[#9490A8] capitalize">{p.payment_mode.replace("_", " ")}</span></td>
                      <td className="px-5 py-3"><span className="font-mono text-xs text-[#9490A8]">{p.reference_no ?? "—"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {payments.length > 12 && (
            <div className="px-5 py-2.5 border-t border-[#2E2840] text-xs text-[#9490A8]">
              Showing 12 of {payments.length} payments
            </div>
          )}
        </Card>

        {/* ── Welfare contribution history ── */}
        <Card>
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center gap-2">
              <HeartHandshake size={13} className="text-rose-400" />
              <h3 className="text-sm font-semibold text-white">Welfare Contributions</h3>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2E2840]/60">
                  {["Amount", "Date", "Mode", "Reference", "Received By"].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10px] font-bold text-[#9490A8] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {welfare.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-[#9490A8] text-sm">
                      No welfare contributions recorded.
                    </td>
                  </tr>
                ) : welfare.slice(0, 10).map((w) => (
                  <tr key={w.id} className="border-b border-[#2E2840]/40 last:border-0 hover:bg-white/[0.015] transition-colors">
                    <td className="px-5 py-3"><span className="text-sm font-semibold text-rose-400">{formatCurrency(w.amount)}</span></td>
                    <td className="px-5 py-3"><span className="text-sm text-[#9490A8]">{fmt(w.contribution_date)}</span></td>
                    <td className="px-5 py-3"><span className="text-sm text-[#9490A8] capitalize">{w.payment_mode.replace("_", " ")}</span></td>
                    <td className="px-5 py-3"><span className="font-mono text-xs text-[#9490A8]">{w.reference_no ?? "—"}</span></td>
                    <td className="px-5 py-3"><span className="text-sm text-white/80">{w.received_by}</span></td>
                  </tr>
                ))}
              </tbody>
              {welfare.length > 0 && (
                <tfoot>
                  <tr className="border-t border-[#2E2840]">
                    <td className="px-5 py-2.5 text-xs font-bold text-rose-400">{formatCurrency(totalWelfare)}</td>
                    <td colSpan={4} className="px-5 py-2.5 text-xs text-[#9490A8]">{welfare.length} contribution{welfare.length !== 1 ? "s" : ""}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        {/* ── Lifecycle events ── */}
        <Card>
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={13} className="text-[#9490A8]" />
                <h3 className="text-sm font-semibold text-white">Lifecycle Events</h3>
              </div>
              <button
                onClick={() => setAddEventOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold hover:bg-amber-400/20 transition-all"
              >
                <Plus size={11} /> Add Event
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-3">
            {events.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar size={28} className="text-[#9490A8]/30 mx-auto mb-2" />
                <p className="text-sm text-[#9490A8]">No lifecycle events recorded.</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-[#2E2840]/50">
                {events.map((ev) => {
                  const label      = ev.event_type.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
                  const icon       = EVENT_ICONS[ev.event_type] ?? "•";
                  const isMarriage = ev.event_type === "marriage";
                  const isDeceased = ev.event_type === "deceased";

                  // Extract spouse name from notes if present
                  let spouseDisplay: string | null = null;
                  let restNotes = ev.notes ?? "";
                  if (isMarriage && ev.notes?.startsWith("Married to: ")) {
                    const lines = ev.notes.split("\n");
                    spouseDisplay = lines[0].replace("Married to: ", "");
                    restNotes = lines.slice(1).join("\n").trim();
                  }

                  return (
                    <div key={ev.id} className="flex items-start gap-3 py-3 group">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-sm",
                        isDeceased ? "bg-[#9490A8]/10 border border-[#9490A8]/20"
                          : isMarriage ? "bg-rose-400/10 border border-rose-400/20"
                          : "bg-purple-400/10 border border-purple-400/20",
                      )}>
                        <span>{icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{label}</p>
                        <p className="text-xs text-[#9490A8]">{fmt(ev.event_date)}</p>
                        {spouseDisplay && (
                          <p className="text-xs text-rose-300 mt-0.5">Spouse: {spouseDisplay}</p>
                        )}
                        {restNotes && <p className="text-xs text-[#9490A8]/70 mt-0.5 italic">{restNotes}</p>}
                      </div>
                      <button
                        onClick={() => deleteEvent(ev.id)}
                        disabled={deletingEvt === ev.id}
                        className={cn(
                          "opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center",
                          "text-[#9490A8] hover:text-rose-400 hover:bg-rose-400/10 transition-all disabled:opacity-40",
                        )}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Modals */}
      <EditMemberModal
        member={memberSummary}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); load(); }}
      />
      <RecordTitheModal
        open={titheOpen}
        onClose={() => setTitheOpen(false)}
        onSuccess={load}
        prefillMemberId={member.id}
      />
      <AddEventModal
        memberId={member.id}
        open={addEventOpen}
        onClose={() => setAddEventOpen(false)}
        onSaved={handleEventSaved}
      />
    </div>
  );
}

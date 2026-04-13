import { useState, useEffect, useMemo } from "react";
import { HandCoins, Plus, Trash2, CheckCircle, Search, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { tauriCreateTithePayment, tauriGetMembers, type MemberSummary } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_MODES = [
  { value: "cash",          label: "Cash"          },
  { value: "mobile_money",  label: "Mobile Money"  },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque",        label: "Cheque"        },
];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
].map((l, i) => ({ value: String(i + 1), label: l }));

const now        = new Date();
const TODAY      = now.toISOString().split("T")[0];
const THIS_MONTH = now.getMonth() + 1;
const THIS_YEAR  = now.getFullYear();
const YEARS      = [-1, 0, 1].map((d) => {
  const y = THIS_YEAR + d;
  return { value: String(y), label: String(y) };
});

interface EntryRow {
  id:          string; // local key
  member_id:   string;
  amount:      string;
  payment_mode:string;
  reference_no:string;
  saved:       boolean;
  error:       string;
}

function makeRow(): EntryRow {
  return {
    id:           crypto.randomUUID(),
    member_id:    "",
    amount:       "",
    payment_mode: "cash",
    reference_no: "",
    saved:        false,
    error:        "",
  };
}

// ── Member picker (inline autocomplete) ──────────────────────────────────────

interface MemberPickerProps {
  members:   MemberSummary[];
  value:     string;
  onChange:  (id: string) => void;
  disabled?: boolean;
}

function MemberPicker({ members, value, onChange, disabled }: MemberPickerProps) {
  const [query, setQuery]       = useState("");
  const [open,  setOpen]        = useState(false);

  const selected = members.find((m) => m.id === value);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return members
      .filter((m) =>
        `${m.first_name} ${m.last_name} ${m.member_no}`.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [members, query]);

  function pick(m: MemberSummary) {
    onChange(m.id);
    setOpen(false);
    setQuery("");
  }

  function clear() { onChange(""); setQuery(""); }

  if (selected) {
    return (
      <div className="flex items-center gap-2 bg-[#211D30] border border-[#2E2840] rounded-xl px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{selected.first_name} {selected.last_name}</p>
          <p className="text-[10px] font-mono text-[#9490A8]">{selected.member_no}</p>
        </div>
        {!disabled && (
          <button onClick={clear} className="text-[#9490A8] hover:text-white transition-colors shrink-0">
            <X size={12} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-[#211D30] border border-[#2E2840] rounded-xl px-3 py-2.5 focus-within:border-amber-400/50 transition-colors">
        <Search size={12} className="text-[#9490A8] shrink-0" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search member…"
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-white placeholder-[#9490A8]/50 outline-none min-w-0"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-[#1C1828] border border-[#2E2840] rounded-xl shadow-2xl overflow-hidden">
          {filtered.map((m) => (
            <button
              key={m.id}
              onMouseDown={() => pick(m)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 text-left transition-colors"
            >
              <div className="w-6 h-6 rounded-md bg-amber-400/15 flex items-center justify-center text-amber-400 text-[10px] font-bold shrink-0">
                {m.first_name[0]}{m.last_name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{m.first_name} {m.last_name}</p>
                <p className="text-[10px] font-mono text-[#9490A8]">{m.member_no}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function BulkTitheModal({ open, onClose, onSuccess }: Props) {
  const [members,     setMembers]     = useState<MemberSummary[]>([]);
  const [loadingMems, setLoadingMems] = useState(false);
  const [rows,        setRows]        = useState<EntryRow[]>([makeRow()]);
  const [paymentDate, setPaymentDate] = useState(TODAY);
  const [periodMonth, setPeriodMonth] = useState(String(THIS_MONTH));
  const [periodYear,  setPeriodYear]  = useState(String(THIS_YEAR));
  const [receivedBy,  setReceivedBy]  = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [doneCount,   setDoneCount]   = useState(0);

  useEffect(() => {
    if (!open) return;
    setRows([makeRow()]);
    setDoneCount(0);
    setLoadingMems(true);
    tauriGetMembers(undefined, "active")
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoadingMems(false));
  }, [open]);

  function setRowField<K extends keyof EntryRow>(rowId: string, key: K, value: EntryRow[K]) {
    setRows((rs) => rs.map((r) => r.id === rowId ? { ...r, [key]: value, error: "" } : r));
  }

  function addRow() { setRows((rs) => [...rs, makeRow()]); }

  function removeRow(rowId: string) {
    setRows((rs) => rs.length === 1 ? rs : rs.filter((r) => r.id !== rowId));
  }

  // Set already-picked member IDs so we can warn duplicates
  const pickedIds = new Set(rows.filter((r) => r.member_id).map((r) => r.member_id));

  const totalAmount = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const validRows   = rows.filter((r) => r.member_id && parseFloat(r.amount) > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receivedBy.trim()) return;
    if (validRows.length === 0) return;

    setSubmitting(true);
    let saved = 0;

    for (const row of validRows) {
      try {
        await tauriCreateTithePayment({
          member_id:    row.member_id,
          amount:       parseFloat(row.amount),
          payment_date: paymentDate,
          period_month: parseInt(periodMonth, 10),
          period_year:  parseInt(periodYear,  10),
          payment_mode: row.payment_mode,
          reference_no: row.reference_no.trim() || undefined,
          received_by:  receivedBy.trim(),
        });
        saved++;
        setRows((rs) => rs.map((r) => r.id === row.id ? { ...r, saved: true } : r));
      } catch (err) {
        setRows((rs) => rs.map((r) => r.id === row.id ? { ...r, error: String(err) } : r));
      }
    }

    setDoneCount(saved);
    setSubmitting(false);
    if (saved > 0) onSuccess();
  }

  function handleClose() {
    setRows([makeRow()]); setDoneCount(0); setReceivedBy("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Bulk Tithe Entry"
      subtitle="Record tithe for multiple members at once" width="lg">
      <form onSubmit={handleSubmit} className="flex flex-col">

        {/* ── Shared fields ── */}
        <div className="px-6 py-4 border-b border-[#2E2840] grid grid-cols-4 gap-4">
          <FormField label="Payment Date" required>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </FormField>
          <FormField label="Period Month" required>
            <Select value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} options={MONTHS} />
          </FormField>
          <FormField label="Period Year" required>
            <Select value={periodYear} onChange={(e) => setPeriodYear(e.target.value)} options={YEARS} />
          </FormField>
          <FormField label="Received By" required>
            <Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="Your name" />
          </FormField>
        </div>

        {/* ── Entry rows ── */}
        <div className="overflow-y-auto" style={{ maxHeight: "380px" }}>
          {/* Header */}
          <div className="sticky top-0 bg-[#1C1828] border-b border-[#2E2840] grid grid-cols-[1fr_120px_140px_130px_32px] gap-2 px-6 py-2.5">
            {["Member", "Amount (GHS)", "Mode", "Reference", ""].map((h) => (
              <span key={h} className="text-[10px] font-bold text-[#9490A8] uppercase tracking-wider">{h}</span>
            ))}
          </div>

          <div className="px-6 py-3 space-y-2">
            {rows.map((row) => (
              <div key={row.id} className={cn(
                "grid grid-cols-[1fr_120px_140px_130px_32px] gap-2 items-start",
                row.saved && "opacity-60",
              )}>
                {/* Member picker */}
                <div>
                  <MemberPicker
                    members={members}
                    value={row.member_id}
                    onChange={(id) => setRowField(row.id, "member_id", id)}
                    disabled={row.saved || loadingMems}
                  />
                  {row.member_id && pickedIds.size !== rows.filter((r) => r.member_id === row.member_id).length + (new Set(rows.map(r => r.member_id)).size - 1) && (
                    <p className="text-[10px] text-amber-400 mt-0.5">Duplicate member</p>
                  )}
                </div>

                {/* Amount */}
                <input
                  type="number"
                  min="0.01" step="0.01"
                  value={row.amount}
                  onChange={(e) => setRowField(row.id, "amount", e.target.value)}
                  disabled={row.saved}
                  placeholder="0.00"
                  className="w-full bg-[#211D30] border border-[#2E2840] rounded-xl px-3 py-2.5 text-sm text-white
                             placeholder-[#9490A8]/50 outline-none focus:border-amber-400/50 transition-colors
                             disabled:opacity-60"
                />

                {/* Payment mode */}
                <select
                  value={row.payment_mode}
                  onChange={(e) => setRowField(row.id, "payment_mode", e.target.value)}
                  disabled={row.saved}
                  className="w-full bg-[#211D30] border border-[#2E2840] rounded-xl px-3 py-2.5 text-sm text-white
                             outline-none transition-colors cursor-pointer disabled:opacity-60"
                >
                  {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>

                {/* Reference */}
                <input
                  type="text"
                  value={row.reference_no}
                  onChange={(e) => setRowField(row.id, "reference_no", e.target.value)}
                  disabled={row.saved}
                  placeholder="Ref (opt.)"
                  className="w-full bg-[#211D30] border border-[#2E2840] rounded-xl px-3 py-2.5 text-sm text-white
                             placeholder-[#9490A8]/50 outline-none focus:border-amber-400/50 transition-colors
                             disabled:opacity-60"
                />

                {/* Delete / status */}
                <div className="flex items-center justify-center pt-1.5">
                  {row.saved ? (
                    <CheckCircle size={16} className="text-emerald-400" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9490A8] hover:text-rose-400 hover:bg-rose-400/10 transition-all disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Row error */}
                {row.error && (
                  <div className="col-span-5 text-xs text-rose-400 -mt-1 pl-1">{row.error}</div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-2 text-xs text-[#9490A8] hover:text-amber-400 transition-colors py-1"
            >
              <Plus size={12} /> Add another member
            </button>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-[#2E2840] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#9490A8]">
              {validRows.length} member{validRows.length !== 1 ? "s" : ""},&nbsp;
              <span className="text-amber-400 font-semibold">{formatCurrency(totalAmount)}</span> total
            </span>
            {doneCount > 0 && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle size={11} /> {doneCount} saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              {doneCount > 0 ? "Close" : "Cancel"}
            </Button>
            <Button
              type="submit"
              loading={submitting}
              disabled={validRows.length === 0 || !receivedBy.trim()}
              icon={<HandCoins size={14} />}
            >
              Save {validRows.length > 0 ? `${validRows.length} Entry` : "Entries"}
              {validRows.length > 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

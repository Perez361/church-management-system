import { useState, useEffect } from "react";
import { HandCoins } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import {
  tauriCreateTithePayment, tauriGetMembers,
  type CreateTitheInput, type MemberSummary,
} from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillMemberId?: string;
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

const now = new Date();
const TODAY = now.toISOString().split("T")[0];
const THIS_MONTH = now.getMonth() + 1;
const THIS_YEAR  = now.getFullYear();

const YEARS = [-1, 0, 1].map((d) => {
  const y = THIS_YEAR + d;
  return { value: String(y), label: String(y) };
});

interface FormState {
  member_id: string; amount: string; payment_date: string;
  period_month: string; period_year: string; payment_mode: string;
  reference_no: string; received_by: string; notes: string;
}

const makeEmpty = (prefill = ""): FormState => ({
  member_id: prefill, amount: "", payment_date: TODAY,
  period_month: String(THIS_MONTH), period_year: String(THIS_YEAR),
  payment_mode: "cash", reference_no: "", received_by: "", notes: "",
});

type Errors = Partial<Record<keyof FormState, string>>;

export function RecordTitheModal({ open, onClose, onSuccess, prefillMemberId }: Props) {
  const [form, setForm]           = useState<FormState>(makeEmpty(prefillMemberId));
  const [errors, setErrors]       = useState<Errors>({});
  const [loading, setLoading]     = useState(false);
  const [serverErr, setServerErr] = useState("");
  const [members, setMembers]     = useState<MemberSummary[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingMembers(true);
    tauriGetMembers(undefined, "active")
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoadingMembers(false));
    setForm(makeEmpty(prefillMemberId));
  }, [open, prefillMemberId]);

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function validate(): boolean {
    const e: Errors = {};
    if (!form.member_id)   e.member_id   = "Select a member";
    if (!form.amount || Number(form.amount) <= 0) e.amount = "Enter a valid amount";
    if (!form.payment_date) e.payment_date = "Required";
    if (!form.received_by.trim()) e.received_by = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerErr("");
    try {
      const input: CreateTitheInput = {
        member_id:    form.member_id,
        amount:       Number(form.amount),
        payment_date: form.payment_date,
        period_month: Number(form.period_month),
        period_year:  Number(form.period_year),
        payment_mode: form.payment_mode,
        reference_no: form.reference_no || undefined,
        received_by:  form.received_by.trim(),
        notes:        form.notes || undefined,
      };
      await tauriCreateTithePayment(input);
      reset(); onSuccess(); onClose();
    } catch (err: unknown) {
      setServerErr(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function reset() { setForm(makeEmpty(prefillMemberId)); setErrors({}); setServerErr(""); }

  const memberOptions = members.map((m) => ({
    value: m.id,
    label: `${m.first_name} ${m.last_name}  ·  ${m.member_no}`,
  }));

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }}
      title="Record Tithe Payment" subtitle="Log a member's tithe contribution" width="md">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

        {serverErr && (
          <div className="px-4 py-3 rounded-xl bg-rose-400/10 border border-rose-400/30 text-rose-400 text-sm">
            {serverErr}
          </div>
        )}

        <FormField label="Member" required error={errors.member_id}>
          <Select
            value={form.member_id}
            onChange={field("member_id")}
            options={memberOptions}
            placeholder={loadingMembers ? "Loading members…" : "Select member…"}
            hasError={!!errors.member_id}
            disabled={loadingMembers}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Amount (GHS)" required error={errors.amount}>
            <Input type="number" min="0.01" step="0.01"
              value={form.amount} onChange={field("amount")}
              placeholder="0.00" hasError={!!errors.amount} />
          </FormField>
          <FormField label="Payment Date" required error={errors.payment_date}>
            <Input type="date" value={form.payment_date}
              onChange={field("payment_date")} hasError={!!errors.payment_date} />
          </FormField>
        </div>

        {/* Period */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Period Month">
            <Select value={form.period_month} onChange={field("period_month")} options={MONTHS} />
          </FormField>
          <FormField label="Period Year">
            <Select value={form.period_year} onChange={field("period_year")} options={YEARS} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Payment Mode">
            <Select value={form.payment_mode} onChange={field("payment_mode")} options={PAYMENT_MODES} />
          </FormField>
          <FormField label="Reference No.">
            <Input value={form.reference_no} onChange={field("reference_no")} placeholder="MM-XXXXXX" />
          </FormField>
        </div>

        <FormField label="Received By" required error={errors.received_by}>
          <Input value={form.received_by} onChange={field("received_by")}
            placeholder="Name of receiver" hasError={!!errors.received_by} />
        </FormField>

        <FormField label="Notes">
          <Textarea value={form.notes} onChange={field("notes")} placeholder="Optional notes…" />
        </FormField>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2E2840]">
          <Button type="button" variant="secondary"
            onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<HandCoins size={14} />}>
            Record Tithe
          </Button>
        </div>
      </form>
    </Modal>
  );
}
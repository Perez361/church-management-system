import { useState, useEffect } from "react";
import { HeartHandshake } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import {
  tauriCreateWelfareContribution, tauriGetMembers,
  type CreateWelfareInput, type MemberSummary,
} from "@/lib/tauri";

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

interface FormState {
  member_id: string; amount: string; contribution_date: string;
  payment_mode: string; reference_no: string; received_by: string;
}

const TODAY  = new Date().toISOString().split("T")[0];
const EMPTY: FormState = {
  member_id: "", amount: "", contribution_date: TODAY,
  payment_mode: "cash", reference_no: "", received_by: "",
};

type Errors = Partial<Record<keyof FormState, string>>;

export function RecordWelfareModal({ open, onClose, onSuccess }: Props) {
  const [form, setForm]           = useState<FormState>(EMPTY);
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
    setForm(EMPTY);
  }, [open]);

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function validate(): boolean {
    const e: Errors = {};
    if (!form.member_id) e.member_id = "Select a member";
    if (!form.amount || Number(form.amount) <= 0) e.amount = "Enter a valid amount";
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
      const input: CreateWelfareInput = {
        member_id:         form.member_id,
        amount:            Number(form.amount),
        contribution_date: form.contribution_date,
        payment_mode:      form.payment_mode,
        reference_no:      form.reference_no || undefined,
        received_by:       form.received_by.trim(),
      };
      await tauriCreateWelfareContribution(input);
      reset(); onSuccess(); onClose();
    } catch (err: unknown) {
      setServerErr(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function reset() { setForm(EMPTY); setErrors({}); setServerErr(""); }

  const memberOptions = members.map((m) => ({
    value: m.id,
    label: `${m.first_name} ${m.last_name}  ·  ${m.member_no}`,
  }));

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }}
      title="Record Welfare Contribution"
      subtitle="Log a member's welfare contribution" width="md">
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
          <FormField label="Contribution Date">
            <Input type="date" value={form.contribution_date}
              onChange={field("contribution_date")} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Payment Mode">
            <Select value={form.payment_mode} onChange={field("payment_mode")}
              options={PAYMENT_MODES} />
          </FormField>
          <FormField label="Reference No.">
            <Input value={form.reference_no} onChange={field("reference_no")}
              placeholder="MM-XXXXXX" />
          </FormField>
        </div>

        <FormField label="Received By" required error={errors.received_by}>
          <Input value={form.received_by} onChange={field("received_by")}
            placeholder="Name of receiver" hasError={!!errors.received_by} />
        </FormField>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2E2840]">
          <Button type="button" variant="secondary"
            onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<HeartHandshake size={14} />}>
            Record Contribution
          </Button>
        </div>
      </form>
    </Modal>
  );
}
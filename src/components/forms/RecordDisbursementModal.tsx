import { useState, useEffect } from "react";
import { ArrowDownLeft } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import {
  tauriCreateWelfareDisbursement, tauriGetMembers,
  type CreateDisbursementInput, type MemberSummary,
} from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  beneficiary_id: string;
  amount: string;
  reason: string;
  disbursement_date: string;
  approved_by: string;
}

const TODAY = new Date().toISOString().split("T")[0];
const EMPTY: FormState = {
  beneficiary_id: "", amount: "", reason: "",
  disbursement_date: TODAY, approved_by: "",
};

type Errors = Partial<Record<keyof FormState, string>>;

export function RecordDisbursementModal({ open, onClose, onSuccess }: Props) {
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
    setErrors({});
    setServerErr("");
  }, [open]);

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function validate(): boolean {
    const e: Errors = {};
    if (!form.beneficiary_id)                          e.beneficiary_id = "Select a member";
    if (!form.amount || Number(form.amount) <= 0)      e.amount         = "Enter a valid amount";
    if (!form.reason.trim())                           e.reason         = "Required";
    if (!form.approved_by.trim())                      e.approved_by    = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerErr("");
    try {
      const input: CreateDisbursementInput = {
        beneficiary_id:    form.beneficiary_id,
        amount:            Number(form.amount),
        reason:            form.reason.trim(),
        disbursement_date: form.disbursement_date,
        approved_by:       form.approved_by.trim(),
      };
      await tauriCreateWelfareDisbursement(input);
      setForm(EMPTY); setErrors({}); setServerErr("");
      onSuccess(); onClose();
    } catch (err: unknown) {
      setServerErr(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const memberOptions = members.map((m) => ({
    value: m.id,
    label: `${m.first_name} ${m.last_name}  ·  ${m.member_no}`,
  }));

  return (
    <Modal open={open} onClose={() => { setForm(EMPTY); setErrors({}); setServerErr(""); onClose(); }}
      title="Record Disbursement"
      subtitle="Record a welfare fund disbursement to a member"
      width="md">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {serverErr && (
          <div className="px-4 py-3 rounded-xl bg-rose-400/10 border border-rose-400/30 text-rose-400 text-sm">
            {serverErr}
          </div>
        )}

        <FormField label="Beneficiary" required error={errors.beneficiary_id}>
          <Select
            value={form.beneficiary_id}
            onChange={field("beneficiary_id")}
            options={memberOptions}
            placeholder={loadingMembers ? "Loading members…" : "Select member…"}
            hasError={!!errors.beneficiary_id}
            disabled={loadingMembers}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Amount (GHS)" required error={errors.amount}>
            <Input type="number" min="0.01" step="0.01"
              value={form.amount} onChange={field("amount")}
              placeholder="0.00" hasError={!!errors.amount} />
          </FormField>
          <FormField label="Disbursement Date">
            <Input type="date" value={form.disbursement_date}
              onChange={field("disbursement_date")} />
          </FormField>
        </div>

        <FormField label="Reason / Purpose" required error={errors.reason}>
          <Textarea value={form.reason} onChange={field("reason")}
            placeholder="Describe the reason for disbursement…" />
        </FormField>

        <FormField label="Approved By" required error={errors.approved_by}>
          <Input value={form.approved_by} onChange={field("approved_by")}
            placeholder="Name of approving officer" hasError={!!errors.approved_by} />
        </FormField>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2E2840]">
          <Button type="button" variant="secondary"
            onClick={() => { setForm(EMPTY); setErrors({}); setServerErr(""); onClose(); }}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} icon={<ArrowDownLeft size={14} />}>
            Record Disbursement
          </Button>
        </div>
      </form>
    </Modal>
  );
}

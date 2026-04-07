import { useState } from "react";
import { Church } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { tauriCreateOffering, type CreateOfferingInput } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SERVICE_TYPES = [
  { value: "Sunday Service",  label: "Sunday Service"  },
  { value: "Midweek Service", label: "Midweek Service" },
  { value: "Special Service", label: "Special Service" },
  { value: "Harvest",         label: "Harvest"         },
  { value: "Conference",      label: "Conference"      },
];

const CATEGORIES = [
  { value: "General Offering", label: "General Offering" },
  { value: "Thanksgiving",     label: "Thanksgiving"     },
  { value: "Building Fund",    label: "Building Fund"    },
  { value: "Missions",         label: "Missions"         },
  { value: "Welfare",          label: "Welfare"          },
  { value: "Special",          label: "Special"          },
];

interface FormState {
  service_date: string; service_type: string; category: string;
  total_amount: string; counted_by: string; notes: string;
}

const TODAY  = new Date().toISOString().split("T")[0];
const EMPTY: FormState = {
  service_date: TODAY, service_type: "Sunday Service",
  category: "General Offering", total_amount: "",
  counted_by: "", notes: "",
};

type Errors = Partial<Record<keyof FormState, string>>;

export function RecordOfferingModal({ open, onClose, onSuccess }: Props) {
  const [form, setForm]           = useState<FormState>(EMPTY);
  const [errors, setErrors]       = useState<Errors>({});
  const [loading, setLoading]     = useState(false);
  const [serverErr, setServerErr] = useState("");

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function validate(): boolean {
    const e: Errors = {};
    if (!form.service_date)   e.service_date  = "Required";
    if (!form.total_amount || Number(form.total_amount) < 0)
      e.total_amount = "Enter a valid amount";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerErr("");
    try {
      const input: CreateOfferingInput = {
        service_date:  form.service_date,
        service_type:  form.service_type,
        category:      form.category,
        total_amount:  Number(form.total_amount),
        currency:      "GHS",
        counted_by:    form.counted_by  || undefined,
        notes:         form.notes       || undefined,
      };
      await tauriCreateOffering(input);
      reset(); onSuccess(); onClose();
    } catch (err: unknown) {
      setServerErr(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function reset() { setForm(EMPTY); setErrors({}); setServerErr(""); }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }}
      title="Record Offering" subtitle="Log a service offering" width="md">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

        {serverErr && (
          <div className="px-4 py-3 rounded-xl bg-rose-400/10 border border-rose-400/30 text-rose-400 text-sm">
            {serverErr}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Service Date" required error={errors.service_date}>
            <Input type="date" value={form.service_date}
              onChange={field("service_date")} hasError={!!errors.service_date} />
          </FormField>
          <FormField label="Service Type">
            <Select value={form.service_type} onChange={field("service_type")}
              options={SERVICE_TYPES} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Category">
            <Select value={form.category} onChange={field("category")} options={CATEGORIES} />
          </FormField>
          <FormField label="Total Amount (GHS)" required error={errors.total_amount}>
            <Input type="number" min="0" step="0.01"
              value={form.total_amount} onChange={field("total_amount")}
              placeholder="0.00" hasError={!!errors.total_amount} />
          </FormField>
        </div>

        <FormField label="Counted By">
          <Input value={form.counted_by} onChange={field("counted_by")}
            placeholder="Name of the person who counted" />
        </FormField>

        <FormField label="Notes">
          <Textarea value={form.notes} onChange={field("notes")} placeholder="Optional notes…" />
        </FormField>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2E2840]">
          <Button type="button" variant="secondary"
            onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<Church size={14} />}>
            Record Offering
          </Button>
        </div>
      </form>
    </Modal>
  );
}
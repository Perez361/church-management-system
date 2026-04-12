import { useState, useEffect } from "react";
import { UserCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import {
  tauriGetMember,
  tauriUpdateMember,
  type CreateMemberInput,
  type MemberSummary,
} from "@/lib/tauri";

interface Props {
  member: MemberSummary | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const GENDERS = [
  { value: "male",   label: "Male"   },
  { value: "female", label: "Female" },
];
const STATUSES = [
  { value: "active",      label: "Active"      },
  { value: "inactive",    label: "Inactive"    },
  { value: "transferred", label: "Transferred" },
];
const DEPARTMENTS = [
  { value: "choir",         label: "Choir"        },
  { value: "ushers",        label: "Ushers"       },
  { value: "youth",         label: "Youth"        },
  { value: "elders",        label: "Elders"       },
  { value: "sunday_school", label: "Sunday School" },
];

interface FormState {
  first_name: string; last_name: string; gender: string;
  date_of_birth: string; phone: string; email: string;
  address: string; department_id: string;
  membership_date: string; status: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

export function EditMemberModal({ member, open, onClose, onSuccess }: Props) {
  const [form, setForm]           = useState<FormState | null>(null);
  const [errors, setErrors]       = useState<Errors>({});
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(false);
  const [serverErr, setServerErr] = useState("");

  // Fetch the full Member record (has date_of_birth & address missing from MemberSummary)
  useEffect(() => {
    if (!open || !member) return;
    setFetching(true);
    setServerErr("");
    tauriGetMember(member.id)
      .then((m) =>
        setForm({
          first_name:      m.first_name,
          last_name:       m.last_name,
          gender:          m.gender,
          date_of_birth:   m.date_of_birth   ?? "",
          phone:           m.phone           ?? "",
          email:           m.email           ?? "",
          address:         m.address         ?? "",
          department_id:   m.department_id   ?? "",
          membership_date: m.membership_date,
          status:          m.status,
        })
      )
      .catch(() => setServerErr("Failed to load member details."))
      .finally(() => setFetching(false));
  }, [open, member]);

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => (f ? { ...f, [key]: e.target.value } : f));
  }

  function validate(): boolean {
    if (!form) return false;
    const e: Errors = {};
    if (!form.first_name.trim()) e.first_name      = "Required";
    if (!form.last_name.trim())  e.last_name       = "Required";
    if (!form.gender)            e.gender          = "Required";
    if (!form.membership_date)   e.membership_date = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!member || !form || !validate()) return;
    setLoading(true);
    setServerErr("");
    try {
      const input: Partial<CreateMemberInput> = {
        first_name:      form.first_name.trim(),
        last_name:       form.last_name.trim(),
        gender:          form.gender,
        date_of_birth:   form.date_of_birth   || undefined,
        phone:           form.phone           || undefined,
        email:           form.email           || undefined,
        address:         form.address         || undefined,
        department_id:   form.department_id   || undefined,
        membership_date: form.membership_date,
        status:          form.status,
      };
      await tauriUpdateMember(member.id, input);
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      setServerErr(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setForm(null);
    setErrors({});
    setServerErr("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Edit Member"
      subtitle={member ? `${member.first_name} ${member.last_name} · ${member.member_no}` : ""}
      width="lg"
    >
      {fetching || !form ? (
        <div className="px-6 py-12 text-center text-[#9490A8] text-sm">
          {serverErr || "Loading…"}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {serverErr && (
            <div className="px-4 py-3 rounded-xl bg-rose-400/10 border border-rose-400/30 text-rose-400 text-sm">
              {serverErr}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required error={errors.first_name}>
              <Input value={form.first_name} onChange={field("first_name")}
                hasError={!!errors.first_name} />
            </FormField>
            <FormField label="Last Name" required error={errors.last_name}>
              <Input value={form.last_name} onChange={field("last_name")}
                hasError={!!errors.last_name} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Gender" required error={errors.gender}>
              <Select value={form.gender} onChange={field("gender")}
                options={GENDERS} hasError={!!errors.gender} />
            </FormField>
            <FormField label="Date of Birth">
              <Input type="date" value={form.date_of_birth} onChange={field("date_of_birth")} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone">
              <Input value={form.phone} onChange={field("phone")} placeholder="0244 123 456" />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={form.email} onChange={field("email")}
                placeholder="name@email.com" />
            </FormField>
          </div>

          <FormField label="Address">
            <Textarea value={form.address} onChange={field("address")}
              placeholder="Residential address…" />
          </FormField>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Department">
              <Select value={form.department_id} onChange={field("department_id")}
                options={DEPARTMENTS} placeholder="Select…" />
            </FormField>
            <FormField label="Membership Date" required error={errors.membership_date}>
              <Input type="date" value={form.membership_date}
                onChange={field("membership_date")} hasError={!!errors.membership_date} />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={field("status")} options={STATUSES} />
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2E2840]">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} icon={<UserCheck size={14} />}>
              Save Changes
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

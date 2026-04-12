import { useState, useRef } from "react";
import { UserPlus, Camera, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { tauriCreateMember, type CreateMemberInput } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const GENDERS    = [{ value: "male", label: "Male" }, { value: "female", label: "Female" }];
const STATUSES   = [
  { value: "active",      label: "Active"      },
  { value: "inactive",    label: "Inactive"    },
  { value: "transferred", label: "Transferred" },
];
const DEPARTMENTS = [
  { value: "choir",        label: "Choir"        },
  { value: "ushers",       label: "Ushers"       },
  { value: "youth",        label: "Youth"        },
  { value: "elders",       label: "Elders"       },
  { value: "sunday_school",label: "Sunday School"},
];

interface FormState {
  first_name: string; last_name: string; gender: string;
  date_of_birth: string; phone: string; email: string;
  address: string; department_id: string;
  membership_date: string; status: string;
  photo_url: string;
}

const EMPTY: FormState = {
  first_name: "", last_name: "", gender: "male", date_of_birth: "",
  phone: "", email: "", address: "", department_id: "",
  membership_date: new Date().toISOString().split("T")[0], status: "active",
  photo_url: "",
};

type Errors = Partial<Record<keyof FormState, string>>;

export function AddMemberModal({ open, onClose, onSuccess }: Props) {
  const [form, setForm]           = useState<FormState>(EMPTY);
  const [errors, setErrors]       = useState<Errors>({});
  const [loading, setLoading]     = useState(false);
  const [serverErr, setServerErr] = useState("");
  const fileInputRef              = useRef<HTMLInputElement>(null);

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((f) => ({ ...f, photo_url: (ev.target?.result as string) ?? "" }));
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected if cleared
    e.target.value = "";
  }

  function clearPhoto() {
    setForm((f) => ({ ...f, photo_url: "" }));
  }

  function validate(): boolean {
    const e: Errors = {};
    if (!form.first_name.trim()) e.first_name = "Required";
    if (!form.last_name.trim())  e.last_name  = "Required";
    if (!form.gender)            e.gender     = "Required";
    if (!form.membership_date)   e.membership_date = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.SyntheticEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerErr("");
    try {
      const input: CreateMemberInput = {
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
        photo_url:       form.photo_url       || undefined,
      };
      await tauriCreateMember(input);
      reset(); onSuccess(); onClose();
    } catch (err: unknown) {
      setServerErr(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function reset() { setForm(EMPTY); setErrors({}); setServerErr(""); }

  const initials = `${form.first_name?.[0] ?? ""}${form.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }}
      title="Add New Member" subtitle="Register a new church member" width="lg">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

        {serverErr && (
          <div className="px-4 py-3 rounded-xl bg-rose-400/10 border border-rose-400/30 text-rose-400 text-sm">
            {serverErr}
          </div>
        )}

        {/* ── Photo picker ──────────────────────────────────────────── */}
        <div className="flex items-center gap-4 pb-2">
          {/* Avatar preview */}
          <div className="relative shrink-0 group">
            {form.photo_url ? (
              <img
                src={form.photo_url}
                alt="Member photo"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/30 shadow"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border-2 border-amber-400/25 flex items-center justify-center text-amber-400 text-xl font-bold select-none">
                {initials}
              </div>
            )}

            {/* Quick-clear overlay */}
            {form.photo_url && (
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-400 flex items-center justify-center shadow hover:bg-rose-300 transition-colors"
              >
                <X size={10} className="text-white" />
              </button>
            )}
          </div>

          {/* Controls */}
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#211D30] border border-[#2E2840] text-sm text-[#9490A8] hover:text-white hover:border-white/20 transition-all"
            >
              <Camera size={13} />
              {form.photo_url ? "Change Photo" : "Choose Photo"}
            </button>
            <p className="text-[11px] text-[#5E5A72] mt-1.5">JPG, PNG or WEBP. Optional.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="First Name" required error={errors.first_name}>
            <Input value={form.first_name} onChange={field("first_name")}
              placeholder="Kwame" hasError={!!errors.first_name} />
          </FormField>
          <FormField label="Last Name" required error={errors.last_name}>
            <Input value={form.last_name} onChange={field("last_name")}
              placeholder="Mensah" hasError={!!errors.last_name} />
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
          <Button type="button" variant="secondary"
            onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<UserPlus size={14} />}>
            Add Member
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Check, X, Users } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  tauriGetDepartments,
  tauriCreateDepartment,
  tauriUpdateDepartment,
  tauriDeleteDepartment,
  type Department,
} from "@/lib/tauri";

function InputField({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#211D30] border border-[#2E2840] rounded-xl px-3 py-2
                 text-sm text-white placeholder-[#9490A8]/50 outline-none
                 focus:border-amber-400/50 transition-colors"
    />
  );
}

interface EditState {
  id: string;
  name: string;
  description: string;
}

export function DepartmentsPanel() {
  const [departments, setDepartments]   = useState<Department[]>([]);
  const [loading,     setLoading]       = useState(true);
  const [addName,     setAddName]       = useState("");
  const [addDesc,     setAddDesc]       = useState("");
  const [adding,      setAdding]        = useState(false);
  const [showAdd,     setShowAdd]       = useState(false);
  const [editing,     setEditing]       = useState<EditState | null>(null);
  const [saving,      setSaving]        = useState(false);
  const [deletingId,  setDeletingId]    = useState<string | null>(null);
  const [error,       setError]         = useState<string | null>(null);

  async function load() {
    try {
      const data = await tauriGetDepartments();
      setDepartments(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!addName.trim()) return;
    setAdding(true); setError(null);
    try {
      await tauriCreateDepartment({ name: addName.trim(), description: addDesc.trim() || undefined });
      setAddName(""); setAddDesc(""); setShowAdd(false);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveEdit() {
    if (!editing || !editing.name.trim()) return;
    setSaving(true); setError(null);
    try {
      await tauriUpdateDepartment(editing.id, {
        name: editing.name.trim(),
        description: editing.description.trim() || undefined,
      });
      setEditing(null);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id); setError(null);
    try {
      await tauriDeleteDepartment(id);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Departments</h2>
              <p className="text-xs text-[#9490A8] mt-0.5">Manage ministry departments and groups</p>
            </div>
            <button
              onClick={() => { setShowAdd((p) => !p); setError(null); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400/10 border border-amber-400/30
                         text-amber-400 text-xs font-semibold hover:bg-amber-400/20 transition-all"
            >
              <Plus size={13} /> Add Department
            </button>
          </div>
        </CardHeader>

        <CardContent className="px-6 py-4 space-y-3">

          {/* Add form */}
          {showAdd && (
            <div className="p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider">New Department</p>
              <InputField value={addName} onChange={setAddName} placeholder="Department name *" />
              <InputField value={addDesc} onChange={setAddDesc} placeholder="Description (optional)" />
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAdd}
                  disabled={adding || !addName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors disabled:opacity-60"
                >
                  <Check size={12} /> {adding ? "Adding…" : "Add"}
                </button>
                <button
                  onClick={() => { setShowAdd(false); setAddName(""); setAddDesc(""); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#9490A8] text-xs hover:text-white transition-colors"
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-400 px-1">{error}</p>
          )}

          {loading ? (
            <p className="text-sm text-[#9490A8] py-4 text-center">Loading…</p>
          ) : departments.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-3 text-[#9490A8]">
              <Users size={32} className="opacity-30" />
              <p className="text-sm">No departments yet. Add one above.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#2E2840]/60">
              {departments.map((dept) => (
                <div key={dept.id} className="py-3">
                  {editing?.id === dept.id ? (
                    /* ── Edit row ── */
                    <div className="space-y-2">
                      <InputField
                        value={editing.name}
                        onChange={(v) => setEditing((e) => e && ({ ...e, name: v }))}
                        placeholder="Department name *"
                      />
                      <InputField
                        value={editing.description}
                        onChange={(v) => setEditing((e) => e && ({ ...e, description: v }))}
                        placeholder="Description (optional)"
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving || !editing.name.trim()}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors disabled:opacity-60"
                        >
                          <Check size={11} /> {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[#9490A8] text-xs hover:text-white transition-colors"
                        >
                          <X size={11} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Display row ── */
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
                        <Users size={14} className="text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{dept.name}</p>
                        {dept.description && (
                          <p className="text-xs text-[#9490A8] truncate mt-0.5">{dept.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditing({ id: dept.id, name: dept.name, description: dept.description ?? "" })}
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                            "text-[#9490A8] hover:text-amber-400 hover:bg-amber-400/10",
                          )}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id)}
                          disabled={deletingId === dept.id}
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                            "text-[#9490A8] hover:text-rose-400 hover:bg-rose-400/10 disabled:opacity-40",
                          )}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

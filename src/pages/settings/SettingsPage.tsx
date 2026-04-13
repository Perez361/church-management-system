import { useState, useEffect, useRef } from "react";
import { SyncPanel } from "@/components/ui/SyncPanel";
import {
  User, Bell, Database, Info, Save, Upload, Shield, FileDown,
  Download, RotateCcw, CheckCircle, AlertCircle,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import {
  tauriGetAppSettings, tauriSaveAppSettings,
  tauriBackupDatabase, tauriRestoreDatabase,
  type AppSettings,
} from "@/lib/tauri";
import { DepartmentsPanel } from "@/components/settings/DepartmentsPanel";
import { ImportPanel } from "@/components/settings/ImportPanel";

type Tab = "profile" | "preferences" | "data" | "departments" | "about";

const TABS: { key: Tab; label: string; Icon: React.ComponentType<{ size: number; className?: string }> }[] = [
  { key: "profile",     label: "Profile",     Icon: User     },
  { key: "preferences", label: "Preferences", Icon: Bell     },
  { key: "data",        label: "Data",        Icon: Database },
  { key: "departments", label: "Departments", Icon: Shield   },
  { key: "about",       label: "About",       Icon: Info     },
];

// ── Small reusables ───────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-6 py-4 border-b border-[#2E2840]/60 last:border-0">
      <label className="text-sm text-[#9490A8] w-36 shrink-0 pt-2">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#211D30] border border-[#2E2840] rounded-xl px-3.5 py-2.5
                 text-sm text-white placeholder-[#9490A8]/50 outline-none
                 focus:border-amber-400/50 transition-colors"
    />
  );
}

function StyledSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#211D30] border border-[#2E2840] rounded-xl px-3.5 py-2.5
                 text-sm text-white outline-none focus:border-amber-400/50
                 transition-colors cursor-pointer">
      {children}
    </select>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#2E2840]/40 last:border-0">
      <span className="text-sm text-white/80">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{ width: 40, height: 22 }}
        className={cn(
          "rounded-full relative transition-colors duration-200 shrink-0",
          checked ? "bg-amber-400" : "bg-[#211D30] border border-[#2E2840]",
        )}
      >
        <span className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
          checked ? "left-[22px]" : "left-0.5",
        )} />
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  currency: "GHS", date_format: "DD/MM/YYYY", language: "English (Ghana)",
  notifications: true, auto_sync: true, show_sync_badge: true, weekly_summary: false,
  church_name: "Grace Covenant Church", supabase_url: "", supabase_anon_key: "",
};

export function SettingsPage() {
  const [activeTab,  setActiveTab]  = useState<Tab>("profile");
  const [settings,   setSettings]   = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState<{ ok: boolean; text: string } | null>(null);
  const [backupMsg,  setBackupMsg]  = useState<{ ok: boolean; text: string } | null>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const { user } = useAppStore();
  const initials = user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "AU";

  useEffect(() => {
    tauriGetAppSettings().then(setSettings).catch(console.error);
  }, []);

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function handleSave() {
    setSaving(true); setSaveMsg(null);
    try {
      await tauriSaveAppSettings(settings);
      setSaveMsg({ ok: true, text: "Settings saved successfully." });
    } catch (e) {
      setSaveMsg({ ok: false, text: String(e) });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  }

  async function handleBackup() {
    setBackupMsg(null);
    try {
      const path = await tauriBackupDatabase();
      setBackupMsg({ ok: true, text: `Backup saved to: ${path}` });
    } catch (e) {
      setBackupMsg({ ok: false, text: String(e) });
    }
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupMsg(null);
    try {
      const msg = await tauriRestoreDatabase((file as File & { path?: string }).path ?? file.name);
      setBackupMsg({ ok: true, text: msg });
    } catch (err) {
      setBackupMsg({ ok: false, text: String(err) });
    }
    if (restoreRef.current) restoreRef.current.value = "";
  }

  return (
    <div>
      <Header title="Settings" subtitle="System configuration" />

      <div className="p-6 flex gap-5 items-start">

        {/* ── Left nav ──────────────────────────────────────────────── */}
        <div className="w-48 shrink-0 space-y-0.5">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
                "text-sm font-medium transition-all duration-150 text-left",
                activeTab === key
                  ? "bg-amber-400/10 text-amber-400"
                  : "text-[#9490A8] hover:text-white hover:bg-white/5",
              )}
            >
              <Icon size={15} className={activeTab === key ? "text-amber-400" : "text-[#9490A8]"} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Right panel ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Profile */}
          {activeTab === "profile" && (
            <Card>
              <CardHeader className="px-6 py-4">
                <h2 className="text-sm font-semibold text-white">Profile Information</h2>
                <p className="text-xs text-[#9490A8] mt-0.5">Church and administrator details</p>
              </CardHeader>
              <CardContent className="px-6 py-2">
                <div className="flex items-center gap-5 py-5 border-b border-[#2E2840]/60">
                  <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border-2 border-amber-400/40 flex items-center justify-center text-amber-400 text-2xl font-bold">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{user?.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="gold">{user?.role}</Badge>
                    </div>
                  </div>
                </div>
                <FieldRow label="Church name">
                  <TextInput value={settings.church_name} onChange={(v) => set("church_name", v)} placeholder="Your church name" />
                </FieldRow>
                <FieldRow label="Role">
                  <div className="flex items-center gap-2">
                    <Badge variant="gold">{user?.role}</Badge>
                    <span className="text-xs text-[#9490A8]">Managed in the auth system</span>
                  </div>
                </FieldRow>
                <div className="pt-5 pb-2 flex items-center gap-3">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300 transition-colors disabled:opacity-60">
                    <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
                  </button>
                  {saveMsg && (
                    <span className={cn("text-sm flex items-center gap-1.5", saveMsg.ok ? "text-emerald-400" : "text-rose-400")}>
                      {saveMsg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {saveMsg.text}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preferences */}
          {activeTab === "preferences" && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="px-6 py-4">
                  <h2 className="text-sm font-semibold text-white">Display & Locale</h2>
                </CardHeader>
                <CardContent className="px-6 py-2">
                  <FieldRow label="Currency">
                    <StyledSelect value={settings.currency} onChange={(v) => set("currency", v)}>
                      <option value="GHS">GHS — Ghana Cedi (₵)</option>
                      <option value="USD">USD — US Dollar ($)</option>
                      <option value="EUR">EUR — Euro (€)</option>
                    </StyledSelect>
                  </FieldRow>
                  <FieldRow label="Date format">
                    <StyledSelect value={settings.date_format} onChange={(v) => set("date_format", v)}>
                      <option>DD/MM/YYYY</option>
                      <option>MM/DD/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </StyledSelect>
                  </FieldRow>
                  <FieldRow label="Language">
                    <StyledSelect value={settings.language} onChange={(v) => set("language", v)}>
                      <option>English (Ghana)</option>
                      <option>English (UK)</option>
                    </StyledSelect>
                  </FieldRow>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="px-6 py-4">
                  <h2 className="text-sm font-semibold text-white">Notifications & Sync</h2>
                </CardHeader>
                <CardContent className="px-6 py-2">
                  <Toggle label="Enable desktop notifications"   checked={settings.notifications}   onChange={(v) => set("notifications",   v)} />
                  <Toggle label="Auto-sync when online"          checked={settings.auto_sync}        onChange={(v) => set("auto_sync",        v)} />
                  <Toggle label="Show sync badge in sidebar"     checked={settings.show_sync_badge}  onChange={(v) => set("show_sync_badge",  v)} />
                  <Toggle label="Weekly summary report"          checked={settings.weekly_summary}   onChange={(v) => set("weekly_summary",   v)} />
                </CardContent>
              </Card>

              <div className="flex items-center gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300 transition-colors disabled:opacity-60">
                  <Save size={14} /> {saving ? "Saving…" : "Save Preferences"}
                </button>
                {saveMsg && (
                  <span className={cn("text-sm flex items-center gap-1.5", saveMsg.ok ? "text-emerald-400" : "text-rose-400")}>
                    {saveMsg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {saveMsg.text}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Data */}
          {activeTab === "data" && (
            <div className="space-y-4">

              {/* Supabase sync + credentials */}
              <Card>
                <CardHeader className="px-6 py-4">
                  <h2 className="text-sm font-semibold text-white">Supabase Cloud Sync</h2>
                  <p className="text-xs text-[#9490A8] mt-0.5">
                    Pushes every local write to Supabase. Retries up to 5 times.
                  </p>
                </CardHeader>
                <CardContent className="px-6 py-5 space-y-5">
                  <SyncPanel />
                  <div className="pt-4 border-t border-[#2E2840] space-y-3">
                    <p className="text-xs font-semibold text-[#9490A8] uppercase tracking-wider">Connection Credentials</p>
                    <FieldRow label="Supabase URL">
                      <TextInput value={settings.supabase_url} onChange={(v) => set("supabase_url", v)} placeholder="https://xxx.supabase.co" />
                    </FieldRow>
                    <FieldRow label="Anon Key">
                      <TextInput value={settings.supabase_anon_key} onChange={(v) => set("supabase_anon_key", v)} placeholder="eyJhbGci…" type="password" />
                    </FieldRow>
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors disabled:opacity-60">
                      <Save size={13} /> {saving ? "Saving…" : "Save Credentials"}
                    </button>
                    {saveMsg && (
                      <span className={cn("text-xs flex items-center gap-1.5", saveMsg.ok ? "text-emerald-400" : "text-rose-400")}>
                        {saveMsg.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />} {saveMsg.text}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Export link */}
              <Card>
                <CardHeader className="px-6 py-4">
                  <h2 className="text-sm font-semibold text-white">Export Data</h2>
                  <p className="text-xs text-[#9490A8] mt-0.5">Excel and PDF exports have moved to the dedicated Export page.</p>
                </CardHeader>
                <CardContent className="px-6 py-5">
                  <NavLink to="/export"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 text-sm font-medium hover:bg-amber-400/20 hover:border-amber-400/50 transition-all">
                    <FileDown size={14} /> Go to Export Page →
                  </NavLink>
                </CardContent>
              </Card>

              {/* Import */}
              <ImportPanel />

              {/* Backup & Restore */}
              <Card>
                <CardHeader className="px-6 py-4">
                  <h2 className="text-sm font-semibold text-white">Backup & Restore</h2>
                  <p className="text-xs text-[#9490A8] mt-0.5">Save a copy of your database or restore from a previous backup.</p>
                </CardHeader>
                <CardContent className="px-6 py-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <button onClick={handleBackup}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-400/10 border border-blue-400/30 text-blue-400 text-sm font-medium hover:bg-blue-400/20 transition-all">
                      <Download size={14} /> Export Backup
                    </button>
                    <button onClick={() => restoreRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#211D30] border border-[#2E2840] text-[#9490A8] text-sm font-medium hover:text-white hover:border-white/20 transition-all">
                      <RotateCcw size={14} /> Restore from Backup
                    </button>
                    <input ref={restoreRef} type="file" accept=".db" className="hidden" onChange={handleRestore} />
                  </div>
                  {backupMsg && (
                    <div className={cn("px-4 py-3 rounded-xl border text-sm flex items-start gap-2",
                      backupMsg.ok
                        ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400"
                        : "bg-rose-400/10 border-rose-400/20 text-rose-400")}>
                      {backupMsg.ok ? <CheckCircle size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
                      {backupMsg.text}
                    </div>
                  )}
                  <p className="text-xs text-[#9490A8]">
                    Backup is saved to your Downloads folder. Restoring replaces all local data — restart the app after restore.
                  </p>
                </CardContent>
              </Card>

              {/* Danger zone */}
              <Card>
                <CardHeader className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-rose-400" />
                    <h2 className="text-sm font-semibold text-white">Danger Zone</h2>
                  </div>
                </CardHeader>
                <CardContent className="px-6 py-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-white">Clear all local records</p>
                      <p className="text-xs text-[#9490A8]">Permanently deletes all data. Cannot be undone.</p>
                    </div>
                    <button className="px-4 py-2 rounded-xl bg-rose-400/10 border border-rose-400/30 text-rose-400 text-xs font-semibold hover:bg-rose-400/20 transition-colors">
                      Clear Data
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Departments */}
          {activeTab === "departments" && <DepartmentsPanel />}

          {/* About */}
          {activeTab === "about" && (
            <Card>
              <CardContent className="px-6 py-10 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border-2 border-amber-400/30 flex items-center justify-center shadow-[0_0_24px_rgba(251,191,36,0.15)]">
                  <span className="text-amber-400 text-2xl font-bold">✝</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">CMS</h2>
                  <p className="text-sm text-[#9490A8] mt-1">Church Management System</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <Badge variant="gold">v0.1.0</Badge>
                  <Badge variant="green">Tauri v2</Badge>
                  <Badge variant="blue">React 19</Badge>
                  <Badge variant="muted">SQLite + Supabase</Badge>
                </div>
                <p className="text-xs text-[#9490A8] max-w-xs leading-relaxed mt-2">
                  A desktop application for managing church membership, tithes, offerings,
                  and welfare contributions. Built with Tauri, React, Rust, and SQLite —
                  offline-first with Supabase cloud sync.
                </p>
                <div className="pt-4 border-t border-[#2E2840] w-full text-xs text-[#9490A8]">
                  © {new Date().getFullYear()} CMS. All rights reserved.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

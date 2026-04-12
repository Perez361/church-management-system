import { useState } from "react";
import { SyncPanel } from "@/components/ui/SyncPanel";
import {
  User, Bell, Database, Info, Save, Upload, Shield, FileDown,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";

type Tab = "profile" | "preferences" | "data" | "about";

const TABS: { key: Tab; label: string; Icon: React.ComponentType<{ size: number; className?: string }> }[] = [
  { key: "profile",     label: "Profile",     Icon: User     },
  { key: "preferences", label: "Preferences", Icon: Bell     },
  { key: "data",        label: "Data",        Icon: Database },
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

function TextInput({ defaultValue, placeholder, type = "text" }: {
  defaultValue?: string; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="w-full bg-[#211D30] border border-[#2E2840] rounded-xl px-3.5 py-2.5
                 text-sm text-white placeholder-[#9490A8]/50 outline-none
                 focus:border-amber-400/50 transition-colors"
    />
  );
}

function StyledSelect({ children }: { children: React.ReactNode }) {
  return (
    <select className="bg-[#211D30] border border-[#2E2840] rounded-xl px-3.5 py-2.5
                       text-sm text-white outline-none focus:border-amber-400/50
                       transition-colors cursor-pointer">
      {children}
    </select>
  );
}

function Toggle({ label, defaultChecked = false }: { label: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#2E2840]/40 last:border-0">
      <span className="text-sm text-white/80">{label}</span>
      <button
        onClick={() => setOn((v) => !v)}
        style={{ width: 40, height: 22 }}
        className={cn(
          "rounded-full relative transition-colors duration-200 shrink-0",
          on ? "bg-amber-400" : "bg-[#211D30] border border-[#2E2840]",
        )}
      >
        <span className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
          on ? "left-[22px]" : "left-0.5",
        )} />
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const { user } = useAppStore();
  const initials = user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "AU";
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
              <Icon
                size={15}
                className={activeTab === key ? "text-amber-400" : "text-[#9490A8]"}
              />
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
                <p className="text-xs text-[#9490A8] mt-0.5">Manage your account details</p>
              </CardHeader>
              <CardContent className="px-6 py-2">
                {/* Avatar */}
                <div className="flex items-center gap-5 py-5 border-b border-[#2E2840]/60">
                  <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border-2 border-amber-400/40 flex items-center justify-center text-amber-400 text-2xl font-bold">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{user?.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="gold">{user?.role}</Badge>
                    </div>
                    <button className="mt-2 text-xs text-[#9490A8] hover:text-white transition-colors">
                      Change avatar →
                    </button>
                  </div>
                </div>

                <FieldRow label="Full name">
                  <TextInput defaultValue={user?.name} />
                </FieldRow>
                <FieldRow label="Email">
                  <TextInput type="email" defaultValue="admin@church.org" placeholder="your@email.com" />
                </FieldRow>
                <FieldRow label="Phone">
                  <TextInput placeholder="+233 …" />
                </FieldRow>
                <FieldRow label="Church name">
                  <TextInput defaultValue="Grace Covenant Church" />
                </FieldRow>
                <FieldRow label="Role">
                  <div className="flex items-center gap-2">
                    <Badge variant="gold">{user?.role}</Badge>
                    <span className="text-xs text-[#9490A8]">Contact your admin to change role</span>
                  </div>
                </FieldRow>

                <div className="pt-5 pb-2">
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300 transition-colors">
                    <Save size={14} /> Save Changes
                  </button>
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
                    <StyledSelect>
                      <option value="GHS">GHS — Ghana Cedi (₵)</option>
                      <option value="USD">USD — US Dollar ($)</option>
                      <option value="EUR">EUR — Euro (€)</option>
                    </StyledSelect>
                  </FieldRow>
                  <FieldRow label="Date format">
                    <StyledSelect>
                      <option>DD/MM/YYYY</option>
                      <option>MM/DD/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </StyledSelect>
                  </FieldRow>
                  <FieldRow label="Language">
                    <StyledSelect>
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
                  <Toggle label="Enable desktop notifications" defaultChecked />
                  <Toggle label="Auto-sync when online" defaultChecked />
                  <Toggle label="Show sync badge in sidebar" defaultChecked />
                  <Toggle label="Weekly summary report" />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300 transition-colors">
                  <Save size={14} /> Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* Data */}
          {activeTab === "data" && (
            <div className="space-y-4">

              {/* ── Supabase Sync ─────────────────────────────────────────── */}
<Card>
  <CardHeader className="px-6 py-4">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold text-white">Supabase Cloud Sync</h2>
        <p className="text-xs text-[#9490A8] mt-0.5">
          Pushes every local write to Supabase automatically.
          Retries failed items up to 5 times.
        </p>
      </div>
    </div>
  </CardHeader>
  <CardContent className="px-6 py-5">
    <SyncPanel />
  </CardContent>
</Card>

              {/* Export — moved to its own page */}
              <Card>
                <CardHeader className="px-6 py-4">
                  <h2 className="text-sm font-semibold text-white">Export Data</h2>
                  <p className="text-xs text-[#9490A8] mt-0.5">
                    Excel and PDF exports have moved to the dedicated Export page.
                  </p>
                </CardHeader>
                <CardContent className="px-6 py-5">
                  <NavLink
                    to="/export"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 text-sm font-medium hover:bg-amber-400/20 hover:border-amber-400/50 transition-all"
                  >
                    <FileDown size={14} />
                    Go to Export Page →
                  </NavLink>
                </CardContent>
              </Card>

              {/* Import */}
              <Card>
                <CardHeader className="px-6 py-4">
                  <h2 className="text-sm font-semibold text-white">Import Data</h2>
                  <p className="text-xs text-[#9490A8] mt-0.5">
                    Import records from a CSV or JSON backup file
                  </p>
                </CardHeader>
                <CardContent className="px-6 py-5">
                  <div className="border-2 border-dashed border-[#2E2840] rounded-2xl p-8 text-center hover:border-amber-400/30 transition-colors cursor-pointer group">
                    <Upload size={24} className="text-[#9490A8] group-hover:text-amber-400 transition-colors mx-auto mb-3" />
                    <p className="text-sm text-white/70">
                      Drag & drop a file here, or{" "}
                      <span className="text-amber-400 underline">browse</span>
                    </p>
                    <p className="text-xs text-[#9490A8] mt-1">
                      Supports CSV and JSON backup files
                    </p>
                  </div>
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
                      <p className="text-xs text-[#9490A8]">
                        Permanently deletes all data. Cannot be undone.
                      </p>
                    </div>
                    <button className="px-4 py-2 rounded-xl bg-rose-400/10 border border-rose-400/30 text-rose-400 text-xs font-semibold hover:bg-rose-400/20 transition-colors">
                      Clear Data
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* About */}
          {activeTab === "about" && (
            <Card>
              <CardContent className="px-6 py-10 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border-2 border-amber-400/30 flex items-center justify-center shadow-[0_0_24px_rgba(251,191,36,0.15)]">
                  <span className="text-amber-400 text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>✝</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    CMS
                  </h2>
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
                  © {new Date().getFullYear()}CMS. All rights reserved.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import {
  FileDown, FileText, Users, HandCoins, Church,
  HeartHandshake, BarChart3, Printer, RefreshCw,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { ExportButton } from "@/components/ui/ExportButton";
import { formatCurrency } from "@/lib/utils";
import {
  tauriExportMembersExcel,
  tauriExportTitheExcel,
  tauriExportOfferingsExcel,
  tauriExportWelfareExcel,
  tauriGetExportSummary,
  type ExportSummary,
} from "@/lib/tauri";

// ── Print stylesheet injected once ───────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body > * { display: none !important; }
  #export-print-area { display: block !important; }
}
#export-print-area { display: none; }
`;

function injectPrintStyle() {
  if (document.getElementById("cms-print-style")) return;
  const s = document.createElement("style");
  s.id = "cms-print-style";
  s.textContent = PRINT_STYLE;
  document.head.appendChild(s);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, icon: Icon, color, bg,
}: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  color: string; bg: string;
}) {
  return (
    <div className="bg-[#1C1828] border border-[#2E2840] rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${bg}`}>
          <Icon size={15} className={color} />
        </div>
        <p className="text-[11px] font-bold text-[#9490A8] uppercase tracking-wider leading-tight">{label}</p>
      </div>
      <p className={`text-2xl font-bold leading-none ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-[#9490A8] mt-1.5">{sub}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ExportPage() {
  const thisYear = new Date().getFullYear();
  const [year,    setYear]    = useState(thisYear);
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { injectPrintStyle(); }, []);

  useEffect(() => {
    setLoading(true);
    tauriGetExportSummary(year)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  function handlePrint() {
    if (!summary) return;
    const content = document.getElementById("export-print-area");
    if (!content) return;
    window.print();
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => thisYear - i);

  return (
    <div>
      <Header title="Export Data" subtitle="Download records as Excel or print as PDF" />

      {/* Print-only area */}
      {summary && (
        <div id="export-print-area" style={{ padding: 32, fontFamily: "sans-serif" }}>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Church Management System — Export Summary</h1>
          <p style={{ color: "#666", marginBottom: 24 }}>Year: {year} · Printed: {new Date().toLocaleDateString()}</p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Total Members",         summary.total_members.toString()],
                ["Active Members",        summary.active_members.toString()],
                ["Tithe Collected",       `GHS ${summary.total_tithe_year.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`],
                ["  — 20% Portion",       `GHS ${summary.tithe_20_pct.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`],
                ["  — 60% Portion",       `GHS ${summary.tithe_60_pct.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`],
                ["  — 20% Balance",       `GHS ${summary.tithe_20_balance.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`],
                ["Offerings Collected",   `GHS ${summary.total_offerings_year.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`],
                ["Welfare Contributions", `GHS ${summary.total_welfare_contrib.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`],
                ["Welfare Disbursed",     `GHS ${summary.total_welfare_disbursed.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`],
                ["Net Welfare Balance",   `GHS ${summary.net_welfare_balance.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px 12px", fontWeight: label.startsWith("  ") ? 400 : 600 }}>{label}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-6 space-y-5">

        {/* ── Year selector ──────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#9490A8]">Year:</span>
          <div className="flex items-center gap-1 bg-[#1C1828] border border-[#2E2840] rounded-xl p-1">
            {yearOptions.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  year === y
                    ? "bg-amber-400/15 text-amber-400"
                    : "text-[#9490A8] hover:text-white"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          {loading && <RefreshCw size={13} className="text-[#9490A8] animate-spin" />}
        </div>

        {/* ── Summary cards ──────────────────────────────────────── */}
        {summary && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Overall Summary — {year}</h2>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#211D30] border border-[#2E2840] text-sm text-[#9490A8] hover:text-white hover:border-white/20 transition-all"
              >
                <Printer size={13} /> Print / Save as PDF
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <SummaryCard label="Total Members"   value={summary.total_members.toString()}     sub={`${summary.active_members} active`} icon={Users}         color="text-blue-400"    bg="bg-blue-400/10 border-blue-400/20"    />
              <SummaryCard label={`Tithe ${year}`} value={formatCurrency(summary.total_tithe_year)}    sub="All tithe payments"  icon={HandCoins}     color="text-amber-400"   bg="bg-amber-400/10 border-amber-400/20"  />
              <SummaryCard label={`Offerings ${year}`} value={formatCurrency(summary.total_offerings_year)} sub="All offerings"  icon={Church}        color="text-emerald-400" bg="bg-emerald-400/10 border-emerald-400/20" />
              <SummaryCard label="Welfare Balance" value={formatCurrency(summary.net_welfare_balance)} sub="Contributions minus disbursements" icon={HeartHandshake} color="text-rose-400" bg="bg-rose-400/10 border-rose-400/20" />
            </div>

            {/* Tithe breakdown */}
            <Card>
              <CardHeader className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <BarChart3 size={13} className="text-amber-400" />
                  <h2 className="text-sm font-semibold text-white">Tithe Allocation Breakdown — {year}</h2>
                </div>
              </CardHeader>
              <CardContent className="px-5 py-4">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "20% Portion",  value: summary.tithe_20_pct,     pct: 20, color: "text-amber-400",   bar: "bg-amber-400"   },
                    { label: "60% Portion",  value: summary.tithe_60_pct,     pct: 60, color: "text-emerald-400", bar: "bg-emerald-400" },
                    { label: "20% Balance",  value: summary.tithe_20_balance, pct: 20, color: "text-blue-400",    bar: "bg-blue-400"    },
                  ].map(({ label, value, pct, color, bar }) => (
                    <div key={label} className="bg-[#1C1828] border border-[#2E2840] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#9490A8]">{label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 ${color}`}>{pct}%</span>
                      </div>
                      <p className={`text-lg font-bold ${color}`}>{formatCurrency(value)}</p>
                      <div className="mt-2 h-1 bg-[#211D30] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-[#2E2840] flex items-center justify-between">
                  <span className="text-xs text-[#9490A8]">Total tithe collected</span>
                  <span className="text-sm font-bold text-white">{formatCurrency(summary.total_tithe_year)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Welfare breakdown */}
            <Card>
              <CardHeader className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <HeartHandshake size={13} className="text-rose-400" />
                  <h2 className="text-sm font-semibold text-white">Welfare Fund Summary</h2>
                </div>
              </CardHeader>
              <CardContent className="px-5 py-4">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Contributions", value: formatCurrency(summary.total_welfare_contrib),   color: "text-emerald-400" },
                    { label: "Total Disbursed",     value: formatCurrency(summary.total_welfare_disbursed), color: "text-rose-400"    },
                    { label: "Net Balance",         value: formatCurrency(summary.net_welfare_balance),     color: "text-amber-400"   },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-[#1C1828] border border-[#2E2840] rounded-xl p-4">
                      <p className="text-xs text-[#9490A8] mb-1">{label}</p>
                      <p className={`text-lg font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Excel exports ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileDown size={13} className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Excel Exports</h2>
            </div>
            <p className="text-xs text-[#9490A8] mt-0.5">
              Formatted spreadsheets with alternating row colours, GHS currency formatting, and totals rows. Saved to your Downloads folder.
            </p>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <ExportButton label="Members (Excel)"                action={tauriExportMembersExcel} />
              <ExportButton label={`Tithe ${year} (Excel)`}       action={() => tauriExportTitheExcel(year)} />
              <ExportButton label={`Offerings ${year} (Excel)`}   action={() => tauriExportOfferingsExcel(year)} />
              <ExportButton label={`Welfare ${year} (Excel)`}     action={() => tauriExportWelfareExcel(year)} />
            </div>
          </CardContent>
        </Card>

        {/* ── PDF / Print ────────────────────────────────────────── */}
        <Card>
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileText size={13} className="text-rose-400" />
              <h2 className="text-sm font-semibold text-white">PDF / Print Report</h2>
            </div>
            <p className="text-xs text-[#9490A8] mt-0.5">
              Print the summary report above as a PDF using your system print dialog (choose "Save as PDF").
            </p>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <button
              onClick={handlePrint}
              disabled={!summary}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-rose-400/10 border border-rose-400/30 text-rose-400 text-sm font-medium hover:bg-rose-400/20 hover:border-rose-400/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer size={15} />
              Print Summary as PDF
            </button>
            <p className="text-xs text-[#9490A8] mt-2.5">
              Opens the system print dialog. Select "Save as PDF" as the destination to export.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

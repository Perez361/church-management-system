import { useState, useEffect } from "react";
import {
  FileDown, FileText, Users, HandCoins, Church,
  HeartHandshake, BarChart3, Printer, RefreshCw,
  CalendarCheck, ChevronLeft, ChevronRight,
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

// ── Inject @media print rule once at startup ──────────────────────────────────
// The print target (.cms-print-target) is appended directly to <body> at print
// time so that `body > .cms-print-target` can override `body > *`.
const PRINT_CSS = `
@media print {
  body > * { display: none !important; }
  body > .cms-print-target { display: block !important; }
  @page { margin: 20mm; }
}
`;
function injectPrintCSS() {
  if (document.getElementById("cms-print-css")) return;
  const s = document.createElement("style");
  s.id = "cms-print-css";
  s.textContent = PRINT_CSS;
  document.head.appendChild(s);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ghsFmt(n: number) {
  return `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(n: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

// ── Build the standalone HTML document for printing ──────────────────────────

function buildPrintHTML(year: number, s: ExportSummary): string {
  const totalIncome   = s.total_tithe_year + s.total_offerings_year;
  const printed       = new Date().toLocaleDateString("en-GH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const sectionStyle  = "margin: 0 0 28px 0;";
  const h2Style       = "font-size: 14px; font-weight: 700; color: #1A3A5C; margin: 0 0 12px 0; padding-bottom: 6px; border-bottom: 2px solid #E0ECF7; text-transform: uppercase; letter-spacing: 0.06em;";
  const tableStyle    = "width: 100%; border-collapse: collapse; font-size: 12.5px;";
  const thStyle       = "background: #1E4D6B; color: #fff; text-align: left; padding: 8px 12px; font-weight: 600;";
  const tdStyle       = "padding: 7px 12px; border-bottom: 1px solid #E8EEF4; color: #1A1A2E;";
  const altTdStyle    = `${tdStyle} background: #EEF4FF;`;
  const amberTdStyle  = `${tdStyle} color: #7A4F00; font-weight: 600;`;
  const greenTdStyle  = `${tdStyle} color: #1A6E3E; font-weight: 600;`;
  const totalRowStyle = "background: #FFF3CD;";
  const totalTdStyle  = `padding: 8px 12px; font-weight: 700; color: #7A4F00; border-top: 2px solid #F5C518;`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Annual Report — ${year}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1A1A2E; margin: 0; padding: 0; }
  h1   { font-size: 22px; font-weight: 800; color: #1E4D6B; margin: 0 0 4px 0; }
  h2   { ${h2Style} }
  .meta { font-size: 11.5px; color: #666; margin-bottom: 28px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 28px; }
  .kpi { background: #F4F8FF; border: 1px solid #D8E6F3; border-radius: 8px; padding: 14px; }
  .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #5A7090; margin-bottom: 6px; }
  .kpi-value { font-size: 18px; font-weight: 800; color: #1E4D6B; }
  .kpi-sub   { font-size: 10px; color: #7A8FA6; margin-top: 3px; }
  table { ${tableStyle} margin: 0; }
  th { ${thStyle} }
  td { ${tdStyle} }
  .alt td  { ${altTdStyle} }
  .total-row td { ${totalTdStyle} }
  .amber { color: #7A4F00 !important; font-weight: 600; }
  .green { color: #1A6E3E !important; font-weight: 600; }
  .blue  { color: #0A4A8E !important; font-weight: 600; }
  .breakdown-20 { background: #FEF9EC; }
  .breakdown-60 { background: #EFF9F0; }
  footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #D8E6F3; font-size: 10.5px; color: #9AA5B0; text-align: center; }
</style>
</head>
<body>
  <h1>&#10013; Church Management System</h1>
  <div class="meta">
    Annual Financial &amp; Membership Review &mdash; <strong>${year}</strong>
    &nbsp;&bull;&nbsp; Printed: ${printed}
  </div>

  <!-- KPI summary strip -->
  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Total Members</div>
      <div class="kpi-value">${s.total_members}</div>
      <div class="kpi-sub">${s.active_members} active</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Tithe — ${year}</div>
      <div class="kpi-value" style="color:#7A4F00">${ghsFmt(s.total_tithe_year)}</div>
      <div class="kpi-sub">All tithe payments</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Offerings — ${year}</div>
      <div class="kpi-value" style="color:#1A6E3E">${ghsFmt(s.total_offerings_year)}</div>
      <div class="kpi-sub">All service offerings</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Income</div>
      <div class="kpi-value" style="color:#1E4D6B">${ghsFmt(totalIncome)}</div>
      <div class="kpi-sub">Tithe + Offerings</div>
    </div>
  </div>

  <!-- Tithe section -->
  <div style="${sectionStyle}">
    <h2>Tithe Collected — ${year}</h2>
    <table>
      <thead>
        <tr><th>Category</th><th>Allocation</th><th style="text-align:right">Amount (GHS)</th><th style="text-align:right">% of Tithe</th></tr>
      </thead>
      <tbody>
        <tr><td>20% Portion</td><td>First allocation</td><td class="breakdown-20" style="text-align:right" class="amber">${ghsFmt(s.tithe_20_pct)}</td><td style="text-align:right">20%</td></tr>
        <tr class="alt"><td>60% Portion</td><td>Main allocation</td><td class="breakdown-60" style="text-align:right" class="green">${ghsFmt(s.tithe_60_pct)}</td><td style="text-align:right">60%</td></tr>
        <tr><td>20% Balance</td><td>Reserve / balance</td><td class="breakdown-20" style="text-align:right" class="amber">${ghsFmt(s.tithe_20_balance)}</td><td style="text-align:right">20%</td></tr>
        <tr class="total-row"><td colspan="2"><strong>Total Tithe Collected</strong></td><td style="text-align:right;${totalTdStyle}">${ghsFmt(s.total_tithe_year)}</td><td style="text-align:right;${totalTdStyle}">100%</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Offerings section -->
  <div style="${sectionStyle}">
    <h2>Offerings Summary — ${year}</h2>
    <table>
      <thead><tr><th>Item</th><th style="text-align:right">Amount (GHS)</th><th style="text-align:right">% of Total Income</th></tr></thead>
      <tbody>
        <tr><td>Total Offerings Collected</td><td style="text-align:right" class="green">${ghsFmt(s.total_offerings_year)}</td><td style="text-align:right">${pct(s.total_offerings_year, totalIncome)}</td></tr>
        <tr class="alt"><td>Total Tithe Collected</td><td style="text-align:right" class="amber">${ghsFmt(s.total_tithe_year)}</td><td style="text-align:right">${pct(s.total_tithe_year, totalIncome)}</td></tr>
        <tr class="total-row"><td><strong>Combined Income</strong></td><td style="text-align:right;${totalTdStyle}">${ghsFmt(totalIncome)}</td><td style="text-align:right;${totalTdStyle}">100%</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Welfare section -->
  <div style="${sectionStyle}">
    <h2>Welfare Fund — ${year}</h2>
    <table>
      <thead><tr><th>Category</th><th style="text-align:right">Amount (GHS)</th></tr></thead>
      <tbody>
        <tr><td>Total Contributions Received</td><td style="text-align:right" class="green">${ghsFmt(s.total_welfare_contrib)}</td></tr>
        <tr class="alt"><td>Total Disbursements Made</td><td style="text-align:right; color:#C0392B; font-weight:600;">− ${ghsFmt(s.total_welfare_disbursed)}</td></tr>
        <tr class="total-row"><td><strong>Net Welfare Balance</strong></td><td style="text-align:right;${totalTdStyle}">${ghsFmt(s.net_welfare_balance)}</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Membership section -->
  <div style="${sectionStyle}">
    <h2>Membership Overview</h2>
    <table>
      <thead><tr><th>Category</th><th style="text-align:right">Count</th></tr></thead>
      <tbody>
        <tr><td>Total Registered Members</td><td style="text-align:right; font-weight:600;">${s.total_members}</td></tr>
        <tr class="alt"><td>Active Members</td><td style="text-align:right; color:#1A6E3E; font-weight:600;">${s.active_members}</td></tr>
        <tr><td>Inactive / Transferred</td><td style="text-align:right; color:#7A8FA6;">${s.total_members - s.active_members}</td></tr>
      </tbody>
    </table>
  </div>

  <footer>
    Church Management System &bull; Generated on ${printed} &bull; Confidential — Internal Use Only
  </footer>
</body>
</html>`;
}

// ── Print trigger ─────────────────────────────────────────────────────────────

function triggerPrint(year: number, summary: ExportSummary) {
  // Build the HTML
  const html = buildPrintHTML(year, summary);

  // Append a hidden div directly to <body> so `body > .cms-print-target` works
  const el = document.createElement("div");
  el.className = "cms-print-target";
  el.style.display = "none";               // hidden in screen mode
  el.innerHTML = html;
  document.body.appendChild(el);

  // Remove after printing (afterprint fires when dialog closes or is cancelled)
  window.addEventListener("afterprint", () => {
    if (document.body.contains(el)) document.body.removeChild(el);
  }, { once: true });

  window.print();
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
  const [year,    setYear]    = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Inject print CSS once
  useEffect(() => { injectPrintCSS(); }, []);

  useEffect(() => {
    setLoading(true);
    setSummary(null);
    tauriGetExportSummary(year)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <div>
      <Header title="Export Data" subtitle="Download records as Excel or print a PDF annual review" />

      <div className="p-6 space-y-5">

        {/* ── Year selector ────────────────────────────────────────── */}
        <div className="bg-[#1C1828] border border-[#2E2840] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck size={14} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Select Year</p>
              <p className="text-xs text-[#9490A8] mt-0.5">
                All exports and the summary below apply to the chosen year.
              </p>
            </div>
            {loading && (
              <RefreshCw size={13} className="text-amber-400 animate-spin ml-auto shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#15121F] border border-[#2E2840] rounded-xl p-1 w-fit">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="p-1.5 rounded-lg text-[#9490A8] hover:text-white hover:bg-white/5 transition-all"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="px-4 py-1 text-sm font-bold text-white min-w-[64px] text-center">
              {year}
            </span>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="p-1.5 rounded-lg text-[#9490A8] hover:text-white hover:bg-white/5 transition-all"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* ── Summary cards ──────────────────────────────────────── */}
        {summary && !loading && (
          <div className="space-y-4">
            {/* Section header */}
            <div>
              <h2 className="text-sm font-semibold text-white">Annual Review — {year}</h2>
              <p className="text-xs text-[#9490A8] mt-0.5">
                Full financial &amp; membership summary for {year}
              </p>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-4 gap-4">
              <SummaryCard label="Total Members"       value={summary.total_members.toString()}              sub={`${summary.active_members} active`}        icon={Users}         color="text-blue-400"    bg="bg-blue-400/10 border-blue-400/20"     />
              <SummaryCard label={`Tithe ${year}`}     value={formatCurrency(summary.total_tithe_year)}     sub="All tithe payments"                         icon={HandCoins}     color="text-amber-400"   bg="bg-amber-400/10 border-amber-400/20"   />
              <SummaryCard label={`Offerings ${year}`} value={formatCurrency(summary.total_offerings_year)} sub="All service offerings"                      icon={Church}        color="text-emerald-400" bg="bg-emerald-400/10 border-emerald-400/20" />
              <SummaryCard label="Welfare Balance"     value={formatCurrency(summary.net_welfare_balance)}  sub="Contributions minus disbursements"           icon={HeartHandshake} color="text-rose-400"  bg="bg-rose-400/10 border-rose-400/20"     />
            </div>

            {/* Tithe allocation breakdown */}
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
                    { label: "20% Portion",  amount: summary.tithe_20_pct,     pct: 20, color: "text-amber-400",   bar: "bg-amber-400",   ring: "bg-amber-400/10 border-amber-400/30"   },
                    { label: "60% Portion",  amount: summary.tithe_60_pct,     pct: 60, color: "text-emerald-400", bar: "bg-emerald-400", ring: "bg-emerald-400/10 border-emerald-400/30" },
                    { label: "20% Balance",  amount: summary.tithe_20_balance, pct: 20, color: "text-blue-400",    bar: "bg-blue-400",    ring: "bg-blue-400/10 border-blue-400/30"       },
                  ].map(({ label, amount, pct: p, color, bar, ring }) => (
                    <div key={label} className={`rounded-xl p-4 border ${ring}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#9490A8]">{label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 ${color}`}>{p}%</span>
                      </div>
                      <p className={`text-lg font-bold ${color}`}>{formatCurrency(amount)}</p>
                      <div className="mt-2 h-1.5 bg-[#211D30] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bar}`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-[#2E2840] flex items-center justify-between">
                  <span className="text-xs text-[#9490A8]">Total tithe collected in {year}</span>
                  <span className="text-sm font-bold text-white">{formatCurrency(summary.total_tithe_year)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Welfare breakdown */}
            <Card>
              <CardHeader className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <HeartHandshake size={13} className="text-rose-400" />
                  <h2 className="text-sm font-semibold text-white">Welfare Fund — {year}</h2>
                </div>
              </CardHeader>
              <CardContent className="px-5 py-4">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Contributions",   value: formatCurrency(summary.total_welfare_contrib),   color: "text-emerald-400", ring: "bg-emerald-400/10 border-emerald-400/20" },
                    { label: "Disbursements",   value: formatCurrency(summary.total_welfare_disbursed), color: "text-rose-400",    ring: "bg-rose-400/10 border-rose-400/20"       },
                    { label: "Net Balance",     value: formatCurrency(summary.net_welfare_balance),     color: "text-amber-400",   ring: "bg-amber-400/10 border-amber-400/20"     },
                  ].map(({ label, value, color, ring }) => (
                    <div key={label} className={`rounded-xl p-4 border ${ring}`}>
                      <p className="text-xs text-[#9490A8] mb-1">{label}</p>
                      <p className={`text-lg font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading placeholder */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={18} className="text-amber-400 animate-spin mr-3" />
            <span className="text-sm text-[#9490A8]">Loading {year} summary…</span>
          </div>
        )}

        {/* ── Excel exports ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileDown size={13} className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Excel Exports — {year}</h2>
            </div>
            <p className="text-xs text-[#9490A8] mt-0.5">
              Formatted spreadsheets with proper headers, alternating row colours,
              GHS currency formatting, tithe 20/60/20 breakdown, and totals rows.
              Saved to your Downloads folder.
            </p>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <ExportButton label="Members (Excel)"              action={tauriExportMembersExcel} />
              <ExportButton label={`Tithe ${year} (Excel)`}     action={() => tauriExportTitheExcel(year)} />
              <ExportButton label={`Offerings ${year} (Excel)`} action={() => tauriExportOfferingsExcel(year)} />
              <ExportButton label={`Welfare ${year} (Excel)`}   action={() => tauriExportWelfareExcel(year)} />
            </div>
          </CardContent>
        </Card>

        {/* ── PDF / Print ────────────────────────────────────────── */}
        <Card>
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileText size={13} className="text-rose-400" />
              <h2 className="text-sm font-semibold text-white">PDF Annual Report — {year}</h2>
            </div>
            <p className="text-xs text-[#9490A8] mt-0.5">
              Generates a full annual review covering tithe breakdown, offerings, welfare, and membership.
              Select "Save as PDF" in the print dialog.
            </p>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <button
              onClick={() => summary && triggerPrint(year, summary)}
              disabled={!summary || loading}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-rose-400/10 border border-rose-400/30 text-rose-400 text-sm font-medium hover:bg-rose-400/20 hover:border-rose-400/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer size={15} />
              Print {year} Annual Report as PDF
            </button>
            <p className="text-xs text-[#9490A8] mt-2.5">
              Opens the system print dialog. Choose <em>Save as PDF</em> as the destination.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

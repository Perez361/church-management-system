import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import * as XLSX from "xlsx";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { tauriCreateMember, tauriCreateTithePayment, type CreateMemberInput, type CreateTitheInput } from "@/lib/tauri";

type ImportType = "members" | "tithe";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

// ── CSV parser (handles quoted fields) ────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQ = !inQ; }
      } else if (ch === "," && !inQ) {
        cells.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

// ── Excel parser (SheetJS) ────────────────────────────────────────────────────

async function parseExcel(file: File): Promise<string[][]> {
  const buf  = await file.arrayBuffer();
  const wb   = XLSX.read(buf, { type: "array" });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const aoa: (string | number | boolean | null | undefined)[][] =
    XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  // Normalise all cells to strings
  return aoa
    .map((row) => row.map((cell) => (cell === null || cell === undefined ? "" : String(cell).trim())))
    .filter((row) => row.some((c) => c !== ""));
}

// ── Row parsers ───────────────────────────────────────────────────────────────

function parseMemberRow(headers: string[], row: string[]): CreateMemberInput | string {
  const col = (name: string) => {
    const idx = headers.findIndex((h) => h.toLowerCase().replace(/\s+/g, "_") === name);
    return idx >= 0 ? row[idx]?.trim() ?? "" : "";
  };
  const firstName = col("first_name") || col("firstname") || col("first");
  const lastName  = col("last_name")  || col("lastname")  || col("last");
  const gender    = col("gender");
  const membershipDate = col("membership_date") || col("join_date") || new Date().toISOString().slice(0, 10);
  if (!firstName) return "Missing first_name";
  if (!lastName)  return "Missing last_name";
  if (!gender)    return "Missing gender";
  return {
    first_name: firstName,
    last_name:  lastName,
    gender,
    phone:           col("phone")           || undefined,
    email:           col("email")           || undefined,
    address:         col("address")         || undefined,
    date_of_birth:   col("date_of_birth")   || undefined,
    membership_date: membershipDate,
    status:          col("status")          || "active",
  };
}

function parseTitheRow(headers: string[], row: string[]): CreateTitheInput | string {
  const col = (name: string) => {
    const idx = headers.findIndex((h) => h.toLowerCase().replace(/\s+/g, "_") === name);
    return idx >= 0 ? row[idx]?.trim() ?? "" : "";
  };
  const memberId    = col("member_id");
  const amountStr   = col("amount");
  const paymentDate = col("payment_date");
  const periodMonth = parseInt(col("period_month"), 10);
  const periodYear  = parseInt(col("period_year"),  10);
  const paymentMode = col("payment_mode") || "cash";
  const receivedBy  = col("received_by")  || "import";
  if (!memberId)          return "Missing member_id";
  if (!amountStr)         return "Missing amount";
  if (!paymentDate)       return "Missing payment_date";
  if (isNaN(periodMonth)) return "Invalid period_month";
  if (isNaN(periodYear))  return "Invalid period_year";
  return {
    member_id:    memberId,
    amount:       parseFloat(amountStr),
    payment_date: paymentDate,
    period_month: periodMonth,
    period_year:  periodYear,
    payment_mode: paymentMode,
    received_by:  receivedBy,
    reference_no: col("reference_no") || undefined,
    notes:        col("notes")        || undefined,
  };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ImportPanel() {
  const [importType, setImportType] = useState<ImportType>("members");
  const [dragging,   setDragging]   = useState(false);
  const [result,     setResult]     = useState<ImportResult | null>(null);
  const [importing,  setImporting]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setResult(null);
    setImporting(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      let rows: string[][];

      if (ext === "xlsx" || ext === "xls" || ext === "ods") {
        rows = await parseExcel(file);
      } else {
        // CSV / TSV / plain text
        const text = await file.text();
        rows = parseCSV(text);
      }

      if (rows.length < 2) {
        setResult({ success: 0, failed: 0, errors: ["File is empty or has only a header row."] });
        return;
      }
      const headers  = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
      const dataRows = rows.slice(1);
      let success = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (row.every((c) => !c)) continue; // skip blank rows
        if (importType === "members") {
          const parsed = parseMemberRow(headers, row);
          if (typeof parsed === "string") {
            errors.push(`Row ${i + 2}: ${parsed}`);
          } else {
            try {
              await tauriCreateMember(parsed);
              success++;
            } catch (e) {
              errors.push(`Row ${i + 2}: ${String(e)}`);
            }
          }
        } else {
          const parsed = parseTitheRow(headers, row);
          if (typeof parsed === "string") {
            errors.push(`Row ${i + 2}: ${parsed}`);
          } else {
            try {
              await tauriCreateTithePayment(parsed);
              success++;
            } catch (e) {
              errors.push(`Row ${i + 2}: ${String(e)}`);
            }
          }
        }
      }
      setResult({ success, failed: errors.length, errors });
    } catch (e) {
      setResult({ success: 0, failed: 0, errors: [String(e)] });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    processFile(files[0]);
  }

  return (
    <Card>
      <CardHeader className="px-6 py-4">
        <h2 className="text-sm font-semibold text-white">Import Data</h2>
        <p className="text-xs text-[#9490A8] mt-0.5">
          Import members or tithe records from a CSV or Excel file.
        </p>
      </CardHeader>
      <CardContent className="px-6 py-5 space-y-4">

        {/* Type selector */}
        <div className="flex gap-2">
          {(["members", "tithe"] as ImportType[]).map((t) => (
            <button
              key={t}
              onClick={() => { setImportType(t); setResult(null); }}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold transition-all border",
                importType === t
                  ? "bg-amber-400/10 border-amber-400/30 text-amber-400"
                  : "bg-transparent border-[#2E2840] text-[#9490A8] hover:text-white hover:border-white/20",
              )}
            >
              {t === "members" ? "Members" : "Tithe Records"}
            </button>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all",
            dragging
              ? "border-amber-400/60 bg-amber-400/5"
              : "border-[#2E2840] hover:border-amber-400/30 hover:bg-white/2",
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center">
            <Upload size={18} className="text-amber-400" />
          </div>
          <div className="text-center">
            <p className="text-sm text-white font-medium">
              {importing ? "Importing…" : "Drop file here or click to browse"}
            </p>
            <p className="text-xs text-[#9490A8] mt-1">Supports .csv, .xlsx, .xls</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Column format hint */}
        <div className="bg-[#211D30] rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={13} className="text-[#9490A8]" />
            <span className="text-xs font-semibold text-[#9490A8] uppercase tracking-wider">
              Required columns — {importType}
            </span>
          </div>
          {importType === "members" ? (
            <p className="text-xs text-[#9490A8] font-mono">
              first_name, last_name, gender, membership_date<br />
              <span className="opacity-60">optional: phone, email, address, date_of_birth, status</span>
            </p>
          ) : (
            <p className="text-xs text-[#9490A8] font-mono">
              member_id, amount, payment_date, period_month, period_year<br />
              <span className="opacity-60">optional: payment_mode, received_by, reference_no, notes</span>
            </p>
          )}
          <p className="text-[10px] text-[#9490A8]/60 mt-1">
            Column names must be in the first row. Excel column headers work the same as CSV.
          </p>
        </div>

        {/* Result */}
        {result && (
          <div className={cn(
            "rounded-xl border p-4 space-y-2",
            result.failed === 0
              ? "bg-emerald-400/10 border-emerald-400/20"
              : "bg-amber-400/10 border-amber-400/20",
          )}>
            <div className="flex items-center gap-2">
              {result.failed === 0
                ? <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                : <AlertCircle size={14} className="text-amber-400 shrink-0" />}
              <span className="text-sm font-medium text-white">
                {result.success} imported successfully
                {result.failed > 0 && `, ${result.failed} failed`}
              </span>
              <button
                onClick={() => setResult(null)}
                className="ml-auto text-[#9490A8] hover:text-white transition-colors"
              >
                <X size={13} />
              </button>
            </div>
            {result.errors.length > 0 && (
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-rose-400 font-mono">{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

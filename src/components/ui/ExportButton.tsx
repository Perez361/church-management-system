import { useState } from "react";
import { Download, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  label: string;
  action: () => Promise<string>;
  className?: string;
}

type State = "idle" | "loading" | "done" | "error";

export function ExportButton({ label, action, className }: ExportButtonProps) {
  const [state, setState] = useState<State>("idle");
  const [path,  setPath]  = useState("");
  const [errMsg, setErrMsg] = useState("");

  async function run() {
    if (state === "loading") return;
    setState("loading");
    setPath("");
    setErrMsg("");
    try {
      const p = await action();
      setPath(p);
      setState("done");
      setTimeout(() => setState("idle"), 5000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrMsg(msg);
      setState("error");
      setTimeout(() => setState("idle"), 5000);
    }
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <button
        onClick={run}
        disabled={state === "loading"}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
          "transition-all duration-150 group text-left w-full",
          "disabled:cursor-wait",
          state === "idle"    && "bg-[#211D30] border-[#2E2840] text-white/80 hover:text-white hover:border-amber-400/30",
          state === "loading" && "bg-[#211D30] border-[#2E2840] text-[#9490A8]",
          state === "done"    && "bg-emerald-400/10 border-emerald-400/30 text-emerald-400",
          state === "error"   && "bg-rose-400/10 border-rose-400/30 text-rose-400",
        )}
      >
        {/* Icon */}
        <span className="shrink-0">
          {state === "idle"    && <Download    size={15} className="text-[#9490A8] group-hover:text-amber-400 transition-colors" />}
          {state === "loading" && <RefreshCw   size={15} className="animate-spin" />}
          {state === "done"    && <CheckCircle size={15} />}
          {state === "error"   && <AlertCircle size={15} />}
        </span>
        <span className="flex-1 truncate">{label}</span>
      </button>

      {/* Path feedback */}
      {state === "done" && path && (
        <p className="text-[10px] text-emerald-400/70 pl-1 truncate" title={path}>
          ✓ Saved → {path.split(/[\\/]/).pop()}
        </p>
      )}
      {state === "error" && errMsg && (
        <p className="text-[10px] text-rose-400/70 pl-1 truncate" title={errMsg}>
          ✗ {errMsg}
        </p>
      )}
    </div>
  );
}
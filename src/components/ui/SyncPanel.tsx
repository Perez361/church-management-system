import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, CheckCircle, AlertCircle,
  Clock, Wifi, WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tauriTriggerSync, tauriGetSyncStats, type SyncStats } from "@/lib/tauri";
import { useAppStore } from "@/stores/appStore";


export function SyncPanel() {
  const [stats,   setStats]   = useState<SyncStats | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [msg,     setMsg]     = useState("");
  const [msgType, setMsgType] = useState<"ok" | "err">("ok");
  const { setSyncStatus, syncStatus, addNotification } = useAppStore();

  const loadStats = useCallback(async () => {
    try {
      const s = await tauriGetSyncStats();
      setStats(s);
      // Keep the sidebar sync indicator in sync
      setSyncStatus({
        ...syncStatus,
        pending:   s.pending,
        is_online: s.configured,
      });
    } catch (e) {
      console.error("Failed to load sync stats:", e);
    }
  }, []);

  // Load on mount, then every 15 seconds
  useEffect(() => {
    loadStats();
    const timer = setInterval(loadStats, 15_000);
    return () => clearInterval(timer);
  }, [loadStats]);

  async function handleSync() {
    if (syncing) return;

    // Guard: check internet before wasting retries on offline state
    if (!navigator.onLine) {
      const offlineMsg = "No internet connection. Please connect to a network and try again.";
      setMsg(offlineMsg);
      setMsgType("err");
      addNotification({ title: "Sync skipped", message: offlineMsg, type: "warning" });
      return;
    }

    setSyncing(true);
    setMsg("");
    try {
      const result = await tauriTriggerSync();
      setMsg(result);
      setMsgType("ok");
      addNotification({ title: "Sync complete", message: result, type: "success" });
      // Give the background task a moment then refresh stats
      setTimeout(loadStats, 3000);
      setTimeout(loadStats, 8000);
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : String(e);
      setMsg(text);
      setMsgType("err");
      addNotification({ title: "Sync failed", message: text, type: "error" });
    } finally {
      setSyncing(false);
    }
  }

  if (!stats) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#9490A8]">
        <RefreshCw size={14} className="animate-spin" />
        Loading sync status…
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Configuration badge */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
        stats.configured
          ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400"
          : "bg-amber-400/10  border-amber-400/20  text-amber-400",
      )}>
        {stats.configured
          ? <Wifi    size={15} className="shrink-0" />
          : <WifiOff size={15} className="shrink-0" />
        }
        {stats.configured
          ? "Supabase is configured — auto-sync every 60 s"
          : "Supabase not configured — check src-tauri/.env"
        }
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", value: stats.pending, color: "text-amber-400",   bg: "bg-amber-400/10",   dot: "bg-amber-400"   },
          { label: "Synced",  value: stats.synced,  color: "text-emerald-400", bg: "bg-emerald-400/10", dot: "bg-emerald-400" },
          { label: "Failed",  value: stats.failed,  color: "text-rose-400",    bg: "bg-rose-400/10",    dot: "bg-rose-400"    },
        ].map(({ label, value, color, bg, dot }) => (
          <div key={label}
            className={cn(
              "rounded-xl p-4 text-center border border-transparent",
              bg,
            )}>
            <p className={cn("text-3xl font-bold tabular-nums", color)}>{value}</p>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
              <p className="text-xs text-[#9490A8]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSync}
          disabled={!stats.configured || syncing}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
            "border border-[#2E2840] bg-[#211D30]",
            stats.configured && !syncing
              ? "text-white hover:border-amber-400/40 hover:bg-amber-400/5"
              : "text-[#9490A8] cursor-not-allowed opacity-60",
          )}
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing…" : "Sync Now"}
        </button>

        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-[#9490A8] hover:text-white transition-colors"
        >
          <Clock size={14} />
          Refresh
        </button>
      </div>

      {/* Feedback message */}
      {msg && (
        <div className={cn(
          "flex items-start gap-2 px-4 py-3 rounded-xl border text-sm",
          msgType === "ok"
            ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400"
            : "bg-rose-400/10  border-rose-400/20  text-rose-400",
        )}>
          {msgType === "ok"
            ? <CheckCircle size={14} className="shrink-0 mt-0.5" />
            : <AlertCircle size={14} className="shrink-0 mt-0.5" />
          }
          {msg}
        </div>
      )}

      {/* Failed items warning */}
      {stats.failed > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-400/10 border border-rose-400/20 text-rose-400 text-sm">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>
            {stats.failed} item{stats.failed > 1 ? "s" : ""} failed after 5 retries.
            Check your Supabase connection and table permissions.
          </span>
        </div>
      )}
    </div>
  );
}
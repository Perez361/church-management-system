import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, CheckCircle, AlertCircle,
  Clock, Wifi, WifiOff, ChevronDown, ChevronUp, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tauriTriggerSync, tauriGetSyncStats, tauriGetSyncQueueItems, tauriRetryFailedSync, type SyncStats, type SyncQueueItem } from "@/lib/tauri";
import { useAppStore } from "@/stores/appStore";


export function SyncPanel() {
  const [stats,        setStats]        = useState<SyncStats | null>(null);
  const [queueItems,   setQueueItems]   = useState<SyncQueueItem[]>([]);
  const [showQueue,    setShowQueue]    = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [retrying,     setRetrying]     = useState(false);
  const [msg,          setMsg]          = useState("");
  const [msgType,      setMsgType]      = useState<"ok" | "err">("ok");
  const { setSyncStatus, syncStatus, addNotification } = useAppStore();

  const loadStats = useCallback(async () => {
    try {
      const s = await tauriGetSyncStats();
      setStats(s);
      setSyncStatus({
        ...syncStatus,
        pending:   s.pending,
        is_online: s.configured,
      });
    } catch (e) {
      console.error("Failed to load sync stats:", e);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const items = await tauriGetSyncQueueItems();
      setQueueItems(items);
    } catch { /* ignore */ }
  }, []);

  // Load on mount, then every 15 seconds
  useEffect(() => {
    loadStats();
    loadQueue();
    const timer = setInterval(() => { loadStats(); loadQueue(); }, 15_000);
    return () => clearInterval(timer);
  }, [loadStats, loadQueue]);

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
      <div className="flex items-center gap-3 flex-wrap">
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

        {stats.failed > 0 && (
          <button
            onClick={async () => {
              if (retrying) return;
              setRetrying(true);
              try {
                const n = await tauriRetryFailedSync();
                setMsg(`${n} failed item${n !== 1 ? "s" : ""} reset — will retry on next sync.`);
                setMsgType("ok");
                addNotification({ title: "Retry queued", message: `${n} failed sync item(s) reset to pending.`, type: "info" });
                await loadStats();
                await loadQueue();
              } catch (e: unknown) {
                setMsg(e instanceof Error ? e.message : String(e));
                setMsgType("err");
              } finally {
                setRetrying(false);
              }
            }}
            disabled={retrying}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-rose-400/30 bg-rose-400/5 text-rose-400 hover:bg-rose-400/15 transition-all disabled:opacity-60"
          >
            <RotateCcw size={14} className={retrying ? "animate-spin" : ""} />
            Retry Failed
          </button>
        )}

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
          <div className="space-y-1">
            <p>
              {stats.failed} item{stats.failed > 1 ? "s" : ""} failed after 5 retries and will not sync automatically.
            </p>
            <p className="text-xs text-rose-300/80">
              Fix your Supabase connection or table permissions, then click <strong>Retry Failed</strong> to queue them again.
            </p>
          </div>
        </div>
      )}

      {/* Queue detail toggle */}
      {(stats.pending > 0 || stats.failed > 0) && (
        <div className="border border-[#2E2840] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowQueue((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-[#9490A8] hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="font-medium">
              {queueItems.length} item{queueItems.length !== 1 ? "s" : ""} pending / failed
            </span>
            {showQueue ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showQueue && (
            <div className="border-t border-[#2E2840] divide-y divide-[#2E2840]/50 max-h-64 overflow-y-auto">
              {queueItems.length === 0 ? (
                <p className="px-4 py-4 text-xs text-[#9490A8] text-center">No items to display.</p>
              ) : queueItems.map((item) => (
                <div key={item.id} className="px-4 py-2.5 flex items-start gap-3">
                  <span className={cn(
                    "mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full",
                    item.status === "failed" ? "bg-rose-400" : "bg-amber-400",
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-white capitalize">{item.operation}</span>
                      <span className="text-xs text-[#9490A8] font-mono">{item.table_name}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                        item.status === "failed"
                          ? "bg-rose-400/15 text-rose-400"
                          : "bg-amber-400/15 text-amber-400",
                      )}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9490A8] font-mono truncate mt-0.5">{item.record_id}</p>
                    {item.retry_count > 0 && (
                      <p className="text-[10px] text-[#5E5A72] mt-0.5">{item.retry_count} retries</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
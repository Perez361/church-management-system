use crate::db::get_pool;
use chrono::Utc;

// Baked in at compile time from src-tauri/.env via build.rs
const SUPABASE_URL: &str = env!("SUPABASE_URL");
const SUPABASE_KEY: &str = env!("SUPABASE_ANON_KEY");

/// Returns true when the credentials look valid.
pub fn is_configured() -> bool {
    !SUPABASE_URL.is_empty()
        && SUPABASE_URL.starts_with("https://")
        && !SUPABASE_KEY.is_empty()
        && SUPABASE_KEY.len() > 20
}

// ── Internal row type ─────────────────────────────────────────────────────────

#[derive(sqlx::FromRow, Debug, Clone)]
struct QueueRow {
    pub id:          i64,
    pub table_name:  String,
    pub record_id:   String,
    pub operation:   String,
    pub payload:     String,
    #[allow(dead_code)]
    pub retry_count: i64,
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Drains up to 100 pending sync_queue rows and pushes them to Supabase.
/// Safe to call repeatedly — already-synced rows are never touched again.
pub async fn run_sync() {
    if !is_configured() {
        println!("⚠️  Supabase not configured — skipping sync");
        return;
    }

    let pool = get_pool();

    let pending = match sqlx::query_as::<_, QueueRow>(
        "SELECT id, table_name, record_id, operation, payload, retry_count
         FROM sync_queue
         WHERE status = 'pending' AND retry_count < 5
         ORDER BY id ASC
         LIMIT 100",
    )
    .fetch_all(pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            println!("❌ Failed to read sync_queue: {}", e);
            return;
        }
    };

    if pending.is_empty() {
        return;
    }

    println!("🔄 Syncing {} pending item(s)…", pending.len());

    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            println!("❌ Failed to build HTTP client: {}", e);
            return;
        }
    };

    let mut synced = 0usize;
    let mut failed = 0usize;
    let mut network_down = false;

    for item in &pending {
        // If we already detected the network is down, stop trying — preserve retries.
        if network_down {
            break;
        }

        let now = Utc::now().to_rfc3339();

        match push_item(&client, item).await {
            Ok(_) => {
                let _ = sqlx::query(
                    "UPDATE sync_queue
                     SET status = 'synced', synced_at = ?
                     WHERE id = ?",
                )
                .bind(&now)
                .bind(item.id)
                .execute(pool)
                .await;

                synced += 1;
            }
            Err(e) => {
                // Detect network-level failures (no internet / DNS / timeout).
                // These are NOT the remote server rejecting the payload — they mean
                // the device is offline. We must NOT burn retry attempts in this case;
                // items stay 'pending' and will be retried on the next sync cycle.
                let is_network_err = e.contains("error sending request")
                    || e.contains("connection refused")
                    || e.contains("timed out")
                    || e.contains("timeout")
                    || e.contains("dns error")
                    || e.contains("failed to lookup address")
                    || e.contains("No route to host")
                    || e.contains("network is unreachable");

                if is_network_err {
                    println!(
                        "⚠️  Network unavailable — stopping sync, retries preserved \
                         [{}/{}]",
                        item.table_name, item.record_id
                    );
                    network_down = true;
                    // Leave status = 'pending', retry_count unchanged.
                    break;
                }

                println!(
                    "❌ Sync failed [{} / {}]: {}",
                    item.table_name, item.record_id, e
                );

                // HTTP-level error (4xx / 5xx) — increment retry; mark failed after 5.
                let _ = sqlx::query(
                    "UPDATE sync_queue
                     SET retry_count = retry_count + 1,
                         status = CASE
                           WHEN retry_count + 1 >= 5 THEN 'failed'
                           ELSE 'pending'
                         END
                     WHERE id = ?",
                )
                .bind(item.id)
                .execute(pool)
                .await;

                failed += 1;
            }
        }
    }

    if network_down {
        println!("📡 Sync paused — device appears offline. Will retry automatically.");
    } else {
        println!("✅ Sync complete — {} synced, {} failed", synced, failed);
    }
}

/// Returns live counts from the sync_queue table.
pub async fn get_stats() -> SyncStats {
    let pool = get_pool();

    #[derive(sqlx::FromRow)]
    struct Row {
        status: String,
        count:  i64,
    }

    let rows = sqlx::query_as::<_, Row>(
        "SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let mut stats = SyncStats {
        pending:     0,
        synced:      0,
        failed:      0,
        configured:  is_configured(),
    };

    for r in rows {
        match r.status.as_str() {
            "pending" => stats.pending = r.count,
            "synced"  => stats.synced  = r.count,
            "failed"  => stats.failed  = r.count,
            _         => {}
        }
    }

    stats
}

#[derive(serde::Serialize)]
pub struct SyncStats {
    pub pending:    i64,
    pub synced:     i64,
    pub failed:     i64,
    pub configured: bool,
}

// ── HTTP push ─────────────────────────────────────────────────────────────────

async fn push_item(client: &reqwest::Client, item: &QueueRow) -> Result<(), String> {
    let payload: serde_json::Value =
        serde_json::from_str(&item.payload).map_err(|e| e.to_string())?;

    let base_url = format!("{}/rest/v1/{}", SUPABASE_URL, item.table_name);

    let response = match item.operation.as_str() {
        // Both insert and update use upsert so they're idempotent
        "insert" | "update" => {
            client
                .post(&base_url)
                .header("apikey",        SUPABASE_KEY)
                .header("Authorization", format!("Bearer {}", SUPABASE_KEY))
                .header("Content-Type",  "application/json")
                .header("Prefer",        "resolution=merge-duplicates,return=minimal")
                .json(&payload)
                .send()
                .await
                .map_err(|e| e.to_string())?
        }

        // Delete only needs the record ID in the query string
        "delete" => {
            let url = format!("{}?id=eq.{}", base_url, item.record_id);
            client
                .delete(&url)
                .header("apikey",        SUPABASE_KEY)
                .header("Authorization", format!("Bearer {}", SUPABASE_KEY))
                .send()
                .await
                .map_err(|e| e.to_string())?
        }

        op => return Err(format!("Unknown operation: {}", op)),
    };

    let status = response.status();
    if status.is_success() {
        Ok(())
    } else {
        let body = response.text().await.unwrap_or_default();
        Err(format!("HTTP {} — {}", status, body))
    }
}
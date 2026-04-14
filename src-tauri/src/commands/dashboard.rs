use crate::db::get_pool;
use crate::models::*;
use crate::sync::SyncStats;
use chrono::{Utc, Datelike};

#[tauri::command]
pub async fn get_dashboard_stats() -> Result<DashboardStats, AppError> {
    let pool        = get_pool();
    let now         = Utc::now();
    let month       = now.month() as i64;
    let year        = now.year() as i64;
    let month_prefix = format!("{:04}-{:02}%", year, month);

    let total_members: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM members WHERE deleted_at IS NULL",
    )
    .fetch_one(pool)
    .await?;

    let active_members: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM members
         WHERE status = 'active' AND deleted_at IS NULL",
    )
    .fetch_one(pool)
    .await?;

    let tithe_month: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount), 0.0) FROM tithe_payments
         WHERE period_month = ? AND period_year = ?",
    )
    .bind(month)
    .bind(year)
    .fetch_one(pool)
    .await?;

    let offerings_month: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(total_amount), 0.0) FROM offerings
         WHERE service_date LIKE ?",
    )
    .bind(&month_prefix)
    .fetch_one(pool)
    .await?;

    let welfare_contrib_total: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount), 0.0) FROM welfare_contributions",
    )
    .fetch_one(pool)
    .await?;

    let welfare_disbursed_total: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount), 0.0) FROM welfare_disbursements
         WHERE status = 'approved'",
    )
    .fetch_one(pool)
    .await?;

    let welfare_disbursed_month: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount), 0.0) FROM welfare_disbursements
         WHERE status = 'approved' AND disbursement_date LIKE ?",
    )
    .bind(&month_prefix)
    .fetch_one(pool)
    .await?;

    let tithe_payers: (i64,) = sqlx::query_as(
        "SELECT COUNT(DISTINCT member_id) FROM tithe_payments
         WHERE period_month = ? AND period_year = ?",
    )
    .bind(month)
    .bind(year)
    .fetch_one(pool)
    .await?;

    let welfare_contributors: (i64,) = sqlx::query_as(
        "SELECT COUNT(DISTINCT member_id) FROM welfare_contributions
         WHERE contribution_date LIKE ?",
    )
    .bind(&month_prefix)
    .fetch_one(pool)
    .await?;

    Ok(DashboardStats {
        total_members:            total_members.0,
        active_members:           active_members.0,
        tithe_this_month:         tithe_month.0,
        offerings_this_month:     offerings_month.0,
        welfare_balance:          welfare_contrib_total.0 - welfare_disbursed_total.0,
        welfare_disbursed_month:  welfare_disbursed_month.0,
        tithe_payers_month:       tithe_payers.0,
        welfare_contributors_month: welfare_contributors.0,
    })
}

#[tauri::command]
pub async fn get_sync_pending_count() -> Result<i64, AppError> {
    let pool = get_pool();
    let row: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM sync_queue WHERE status = 'pending'",
    )
    .fetch_one(pool)
    .await?;
    Ok(row.0)
}

/// Kicks off a sync in the background and returns immediately.
/// The actual work runs in a spawned task — the UI stays responsive.
#[tauri::command]
pub async fn trigger_sync() -> Result<String, String> {
    if !crate::sync::is_configured() {
        return Err(
            "Supabase is not configured. Check src-tauri/.env".into()
        );
    }
    tokio::spawn(async {
        crate::sync::run_sync().await;
    });
    Ok("Sync started".into())
}

/// Returns live pending / synced / failed counts plus whether Supabase is configured.
#[tauri::command]
pub async fn get_sync_stats() -> Result<SyncStats, String> {
    Ok(crate::sync::get_stats().await)
}

/// Returns the most recent pending + failed sync_queue rows for display in the UI.
#[tauri::command]
pub async fn get_sync_queue_items() -> Result<Vec<SyncQueueItem>, AppError> {
    let pool = get_pool();
    let rows = sqlx::query_as::<_, SyncQueueItem>(
        "SELECT id, table_name, record_id, operation, status, retry_count, created_at
         FROM sync_queue
         WHERE status IN ('pending', 'failed')
         ORDER BY id DESC
         LIMIT 50",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

#[derive(serde::Serialize, sqlx::FromRow)]
pub struct SyncQueueItem {
    pub id:          i64,
    pub table_name:  String,
    pub record_id:   String,
    pub operation:   String,
    pub status:      String,
    pub retry_count: i64,
    pub created_at:  String,
}

/// Resets all failed sync_queue items back to pending so they will be retried.
/// Returns the number of items reset.
#[tauri::command]
pub async fn retry_failed_sync() -> Result<u64, AppError> {
    let pool = get_pool();
    let result = sqlx::query(
        "UPDATE sync_queue SET status = 'pending', retry_count = 0 WHERE status = 'failed'",
    )
    .execute(pool)
    .await?;
    Ok(result.rows_affected())
}
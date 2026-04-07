use crate::db::get_pool;
use crate::models::*;
use crate::commands::members::{queue_sync, queue_sync_payload};
use chrono::Utc;
use uuid::Uuid;

#[tauri::command]
pub async fn get_welfare_contributions(
    member_id: Option<String>,
) -> Result<Vec<WelfareContribution>, AppError> {
    let pool = get_pool();

    let rows = if let Some(mid) = member_id {
        sqlx::query_as::<_, WelfareContribution>(
            "SELECT * FROM welfare_contributions
             WHERE member_id = ?
             ORDER BY contribution_date DESC",
        )
        .bind(&mid)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, WelfareContribution>(
            "SELECT * FROM welfare_contributions
             ORDER BY contribution_date DESC
             LIMIT 100",
        )
        .fetch_all(pool)
        .await?
    };

    Ok(rows)
}

#[tauri::command]
pub async fn create_welfare_contribution(
    input: CreateWelfareInput,
) -> Result<WelfareContribution, AppError> {
    let pool = get_pool();
    let id   = Uuid::new_v4().to_string();
    let now  = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO welfare_contributions
         (id, member_id, amount, contribution_date, payment_mode,
          reference_no, received_by, created_at)
         VALUES (?,?,?,?,?,?,?,?)",
    )
    .bind(&id)
    .bind(&input.member_id)
    .bind(input.amount)
    .bind(&input.contribution_date)
    .bind(&input.payment_mode)
    .bind(&input.reference_no)
    .bind(&input.received_by)
    .bind(&now)
    .execute(pool)
    .await?;

    // Fetch the full inserted row so we have the complete payload for sync
    let row = sqlx::query_as::<_, WelfareContribution>(
        "SELECT * FROM welfare_contributions WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(pool)
    .await?;

    // Queue the full row as the sync payload
    let payload = serde_json::to_value(&row)
        .unwrap_or_else(|_| serde_json::json!({ "id": &id }));
    queue_sync_payload(pool, "welfare_contributions", &id, "insert", payload).await;

    Ok(row)
}

#[tauri::command]
pub async fn get_welfare_disbursements() -> Result<Vec<WelfareDisbursement>, AppError> {
    let pool = get_pool();
    let rows = sqlx::query_as::<_, WelfareDisbursement>(
        "SELECT * FROM welfare_disbursements
         ORDER BY disbursement_date DESC",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

#[tauri::command]
pub async fn create_welfare_disbursement(
    input: CreateDisbursementInput,
) -> Result<WelfareDisbursement, AppError> {
    let pool = get_pool();
    let id   = Uuid::new_v4().to_string();
    let now  = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO welfare_disbursements
         (id, beneficiary_id, amount, reason, disbursement_date,
          approved_by, status, created_at)
         VALUES (?,?,?,?,?,?,'approved',?)",
    )
    .bind(&id)
    .bind(&input.beneficiary_id)
    .bind(input.amount)
    .bind(&input.reason)
    .bind(&input.disbursement_date)
    .bind(&input.approved_by)
    .bind(&now)
    .execute(pool)
    .await?;

    // Fetch the full inserted row so we have the complete payload for sync
    let row = sqlx::query_as::<_, WelfareDisbursement>(
        "SELECT * FROM welfare_disbursements WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(pool)
    .await?;

    // Queue the full row as the sync payload
    let payload = serde_json::to_value(&row)
        .unwrap_or_else(|_| serde_json::json!({ "id": &id }));
    queue_sync_payload(pool, "welfare_disbursements", &id, "insert", payload).await;

    Ok(row)
}

#[tauri::command]
pub async fn get_welfare_balance() -> Result<f64, AppError> {
    let pool = get_pool();

    let contrib: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount), 0.0) FROM welfare_contributions",
    )
    .fetch_one(pool)
    .await?;

    let disbursed: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount), 0.0)
         FROM welfare_disbursements
         WHERE status = 'approved'",
    )
    .fetch_one(pool)
    .await?;

    Ok(contrib.0 - disbursed.0)
}
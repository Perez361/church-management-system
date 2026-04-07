use crate::db::get_pool;
use crate::models::*;
use crate::commands::members::queue_sync;
use chrono::Utc;
use uuid::Uuid;

#[tauri::command]
pub async fn get_tithe_payments(
    month: Option<i64>,
    year: Option<i64>,
    member_id: Option<String>,
) -> Result<Vec<TithePayment>, AppError> {
    let pool = get_pool();

    let rows = if let (Some(m), Some(y)) = (month, year) {
        sqlx::query_as::<_, TithePayment>(
            "SELECT * FROM tithe_payments
             WHERE period_month = ? AND period_year = ?
             ORDER BY payment_date DESC",
        )
        .bind(m)
        .bind(y)
        .fetch_all(pool)
        .await?
    } else if let Some(mid) = member_id {
        sqlx::query_as::<_, TithePayment>(
            "SELECT * FROM tithe_payments WHERE member_id = ? ORDER BY payment_date DESC",
        )
        .bind(&mid)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, TithePayment>(
            "SELECT * FROM tithe_payments ORDER BY payment_date DESC LIMIT 100",
        )
        .fetch_all(pool)
        .await?
    };

    Ok(rows)
}

#[tauri::command]
pub async fn create_tithe_payment(input: CreateTitheInput) -> Result<TithePayment, AppError> {
    let pool = get_pool();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO tithe_payments
         (id, member_id, amount, payment_date, period_month, period_year,
          payment_mode, reference_no, received_by, notes, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    )
    .bind(&id)
    .bind(&input.member_id)
    .bind(input.amount)
    .bind(&input.payment_date)
    .bind(input.period_month)
    .bind(input.period_year)
    .bind(&input.payment_mode)
    .bind(&input.reference_no)
    .bind(&input.received_by)
    .bind(&input.notes)
    .bind(&now)
    .execute(pool)
    .await?;

    queue_sync(pool, "tithe_payments", &id, "insert").await;

    let row = sqlx::query_as::<_, TithePayment>(
        "SELECT * FROM tithe_payments WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

#[tauri::command]
pub async fn get_tithe_summary(year: i64) -> Result<Vec<serde_json::Value>, AppError> {
    let pool = get_pool();

    #[derive(sqlx::FromRow)]
    struct Row {
        month: i64,
        total: f64,
        payers: i64,
    }

    let rows = sqlx::query_as::<_, Row>(
        "SELECT period_month as month,
                COALESCE(SUM(amount), 0.0) as total,
                COUNT(DISTINCT member_id) as payers
         FROM tithe_payments
         WHERE period_year = ?
         GROUP BY period_month
         ORDER BY period_month",
    )
    .bind(year)
    .fetch_all(pool)
    .await?;

    let result = rows
        .iter()
        .map(|r| serde_json::json!({
            "month": r.month,
            "total": r.total,
            "payers": r.payers
        }))
        .collect();

    Ok(result)
}
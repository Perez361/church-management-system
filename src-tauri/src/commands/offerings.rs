use crate::db::get_pool;
use crate::models::*;
use crate::commands::members::queue_sync_payload;
use chrono::Utc;
use uuid::Uuid;

#[tauri::command]
pub async fn get_offerings(
    from_date: Option<String>,
    to_date: Option<String>,
) -> Result<Vec<Offering>, AppError> {
    let pool = get_pool();

    let rows = match (from_date, to_date) {
        (Some(from), Some(to)) => {
            sqlx::query_as::<_, Offering>(
                "SELECT * FROM offerings
                 WHERE service_date BETWEEN ? AND ?
                 ORDER BY service_date DESC",
            )
            .bind(&from)
            .bind(&to)
            .fetch_all(pool)
            .await?
        }
        _ => {
            sqlx::query_as::<_, Offering>(
                "SELECT * FROM offerings
                 ORDER BY service_date DESC
                 LIMIT 100",
            )
            .fetch_all(pool)
            .await?
        }
    };

    Ok(rows)
}

#[tauri::command]
pub async fn create_offering(input: CreateOfferingInput) -> Result<Offering, AppError> {
    let pool     = get_pool();
    let id       = Uuid::new_v4().to_string();
    let now      = Utc::now().to_rfc3339();
    let currency = input.currency.unwrap_or_else(|| "GHS".into());

    sqlx::query(
        "INSERT INTO offerings
         (id, service_date, service_type, category, total_amount,
          currency, notes, counted_by, created_at)
         VALUES (?,?,?,?,?,?,?,?,?)",
    )
    .bind(&id)
    .bind(&input.service_date)
    .bind(&input.service_type)
    .bind(&input.category)
    .bind(input.total_amount)
    .bind(&currency)
    .bind(&input.notes)
    .bind(&input.counted_by)
    .bind(&now)
    .execute(pool)
    .await?;

    // Fetch the full inserted row so we have the complete payload for sync
    let row = sqlx::query_as::<_, Offering>(
        "SELECT * FROM offerings WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(pool)
    .await?;

    // Queue the full row as the sync payload
    let payload = serde_json::to_value(&row)
        .unwrap_or_else(|_| serde_json::json!({ "id": &id }));
    queue_sync_payload(pool, "offerings", &id, "insert", payload).await;

    Ok(row)
}

#[tauri::command]
pub async fn get_offerings_summary(year: i64) -> Result<serde_json::Value, AppError> {
    let pool     = get_pool();
    let year_str = year.to_string();

    #[derive(sqlx::FromRow)]
    struct MonthRow {
        month: String,
        total: f64,
    }

    #[derive(sqlx::FromRow)]
    struct CatRow {
        category: String,
        total:    f64,
    }

    let monthly = sqlx::query_as::<_, MonthRow>(
        "SELECT strftime('%m', service_date) AS month,
                COALESCE(SUM(total_amount), 0.0) AS total
         FROM offerings
         WHERE strftime('%Y', service_date) = ?
         GROUP BY month
         ORDER BY month",
    )
    .bind(&year_str)
    .fetch_all(pool)
    .await?;

    let by_category = sqlx::query_as::<_, CatRow>(
        "SELECT category,
                COALESCE(SUM(total_amount), 0.0) AS total
         FROM offerings
         WHERE strftime('%Y', service_date) = ?
         GROUP BY category
         ORDER BY total DESC",
    )
    .bind(&year_str)
    .fetch_all(pool)
    .await?;

    Ok(serde_json::json!({
        "monthly": monthly.iter().map(|r| serde_json::json!({
            "month": r.month.parse::<i64>().unwrap_or(0),
            "total": r.total,
        })).collect::<Vec<_>>(),
        "by_category": by_category.iter().map(|r| serde_json::json!({
            "category": r.category,
            "total":    r.total,
        })).collect::<Vec<_>>(),
    }))
}
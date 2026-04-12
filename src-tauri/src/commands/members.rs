use crate::db::get_pool;
use crate::models::*;
use chrono::Utc;
use uuid::Uuid;

async fn next_member_no(pool: &sqlx::SqlitePool) -> String {
    let count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM members WHERE deleted_at IS NULL")
            .fetch_one(pool)
            .await
            .unwrap_or((0,));
    format!("CHR-{:03}", count.0 + 1)
}

#[tauri::command]
pub async fn get_members(
    search: Option<String>,
    status: Option<String>,
) -> Result<Vec<MemberSummary>, AppError> {
    let pool = get_pool();
    let search_pat   = format!("%{}%", search.unwrap_or_default().to_lowercase());
    let status_filter = status.unwrap_or_else(|| "%".to_string());

    let rows = sqlx::query_as::<_, MemberSummary>(
        "SELECT id, member_no, first_name, last_name, gender,
                phone, email, department_id, membership_date, status
         FROM members
         WHERE deleted_at IS NULL
           AND status LIKE ?
           AND (LOWER(first_name || ' ' || last_name) LIKE ? OR member_no LIKE ?)
         ORDER BY first_name, last_name",
    )
    .bind(&status_filter)
    .bind(&search_pat)
    .bind(&search_pat)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

#[tauri::command]
pub async fn get_member(id: String) -> Result<Member, AppError> {
    let pool = get_pool();
    let row = sqlx::query_as::<_, Member>(
        "SELECT * FROM members WHERE id = ? AND deleted_at IS NULL",
    )
    .bind(&id)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

#[tauri::command]
pub async fn create_member(input: CreateMemberInput) -> Result<Member, AppError> {
    let pool      = get_pool();
    let id        = Uuid::new_v4().to_string();
    let now       = Utc::now().to_rfc3339();
    let member_no = next_member_no(pool).await;
    let status    = input.status.unwrap_or_else(|| "active".into());

    sqlx::query(
        "INSERT INTO members
         (id, member_no, first_name, last_name, date_of_birth, gender,
          phone, email, address, department_id, membership_date, status,
          photo_url, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
    .bind(&id)
    .bind(&member_no)
    .bind(&input.first_name)
    .bind(&input.last_name)
    .bind(&input.date_of_birth)
    .bind(&input.gender)
    .bind(&input.phone)
    .bind(&input.email)
    .bind(&input.address)
    .bind(&input.department_id)
    .bind(&input.membership_date)
    .bind(&status)
    .bind(&input.photo_url)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;

    // Queue with full payload for sync
    queue_member_sync(pool, &id, "insert").await;

    get_member(id.to_owned()).await
}

#[tauri::command]
pub async fn update_member(id: String, input: UpdateMemberInput) -> Result<Member, AppError> {
    let pool = get_pool();
    let now  = Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE members SET
         first_name      = COALESCE(?, first_name),
         last_name       = COALESCE(?, last_name),
         date_of_birth   = COALESCE(?, date_of_birth),
         gender          = COALESCE(?, gender),
         phone           = COALESCE(?, phone),
         email           = COALESCE(?, email),
         address         = COALESCE(?, address),
         department_id   = COALESCE(?, department_id),
         membership_date = COALESCE(?, membership_date),
         status          = COALESCE(?, status),
         updated_at      = ?
         WHERE id = ? AND deleted_at IS NULL",
    )
    .bind(&input.first_name)
    .bind(&input.last_name)
    .bind(&input.date_of_birth)
    .bind(&input.gender)
    .bind(&input.phone)
    .bind(&input.email)
    .bind(&input.address)
    .bind(&input.department_id)
    .bind(&input.membership_date)
    .bind(&input.status)
    .bind(&now)
    .bind(&id)
    .execute(pool)
    .await?;

    // Queue with full updated payload for sync
    queue_member_sync(pool, &id, "update").await;

    get_member(id.to_owned()).await
}

#[tauri::command]
pub async fn delete_member(id: String) -> Result<bool, AppError> {
    let pool = get_pool();
    let now  = Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE members SET deleted_at = ?, updated_at = ? WHERE id = ?",
    )
    .bind(&now)
    .bind(&now)
    .bind(&id)
    .execute(pool)
    .await?;

    // Delete only needs the ID — no need to fetch the full row
    queue_sync(pool, "members", &id, "delete").await;

    Ok(true)
}

#[tauri::command]
pub async fn get_member_count() -> Result<i64, AppError> {
    let pool = get_pool();
    let row: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM members WHERE deleted_at IS NULL")
            .fetch_one(pool)
            .await?;
    Ok(row.0)
}

// ── Sync helpers ──────────────────────────────────────────────────────────────

/// Minimal sync entry — just stores the record ID.
/// Used for deletes where we only need the ID on the remote side.
pub async fn queue_sync(
    pool: &sqlx::SqlitePool,
    table: &str,
    record_id: &str,
    op: &str,
) {
    queue_sync_payload(
        pool,
        table,
        record_id,
        op,
        serde_json::json!({ "id": record_id }),
    )
    .await;
}

/// Full sync entry — stores the complete row as JSON payload.
/// This is what the sync worker will POST/PATCH to Supabase.
pub async fn queue_sync_payload(
    pool: &sqlx::SqlitePool,
    table: &str,
    record_id: &str,
    op: &str,
    payload: serde_json::Value,
) {
    let now         = Utc::now().to_rfc3339();
    let payload_str = payload.to_string();

    let _ = sqlx::query(
        "INSERT INTO sync_queue
         (table_name, record_id, operation, payload, status, retry_count, created_at)
         VALUES (?,?,?,?,'pending',0,?)",
    )
    .bind(table)
    .bind(record_id)
    .bind(op)
    .bind(&payload_str)
    .bind(&now)
    .execute(pool)
    .await;
}

/// Fetches the full member row then queues it as a sync payload.
/// Used for inserts and updates so Supabase receives the complete record.
pub async fn queue_member_sync(pool: &sqlx::SqlitePool, id: &str, op: &str) {
    let row = sqlx::query_as::<_, Member>(
        "SELECT * FROM members WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    let payload = match row {
        Some(m) => serde_json::to_value(&m)
            .unwrap_or_else(|_| serde_json::json!({ "id": id })),
        None => serde_json::json!({ "id": id }),
    };

    queue_sync_payload(pool, "members", id, op, payload).await;
}
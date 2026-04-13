use crate::db::get_pool;
use crate::models::AppError;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct MemberEvent {
    pub id:         String,
    pub member_id:  String,
    pub event_type: String,
    pub event_date: String,
    pub notes:      Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMemberEventInput {
    pub member_id:  String,
    pub event_type: String,
    pub event_date: String,
    pub notes:      Option<String>,
}

pub const EVENT_TYPES: &[&str] = &[
    "baptism", "confirmation", "marriage", "bereavement",
    "transfer_out", "return", "ordination", "other",
];

#[tauri::command]
pub async fn get_member_events(member_id: String) -> Result<Vec<MemberEvent>, AppError> {
    let pool = get_pool();
    let rows = sqlx::query_as::<_, MemberEvent>(
        "SELECT * FROM member_events WHERE member_id = ? ORDER BY event_date DESC",
    )
    .bind(&member_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

#[tauri::command]
pub async fn create_member_event(input: CreateMemberEventInput) -> Result<MemberEvent, AppError> {
    let pool = get_pool();
    let id   = Uuid::new_v4().to_string();
    let now  = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO member_events (id, member_id, event_type, event_date, notes, created_at)
         VALUES (?,?,?,?,?,?)",
    )
    .bind(&id)
    .bind(&input.member_id)
    .bind(&input.event_type)
    .bind(&input.event_date)
    .bind(&input.notes)
    .bind(&now)
    .execute(pool)
    .await?;
    let row = sqlx::query_as::<_, MemberEvent>(
        "SELECT * FROM member_events WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

#[tauri::command]
pub async fn delete_member_event(id: String) -> Result<bool, AppError> {
    let pool = get_pool();
    sqlx::query("DELETE FROM member_events WHERE id = ?")
        .bind(&id)
        .execute(pool)
        .await?;
    Ok(true)
}

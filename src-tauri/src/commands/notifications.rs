use crate::db::get_pool;
use crate::models::AppError;
use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct DbNotification {
    pub id:         i64,
    pub title:      String,
    pub message:    String,
    #[sqlx(rename = "type")]
    pub kind:       String,
    pub read:       bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNotificationInput {
    pub title:   String,
    pub message: String,
    pub kind:    String,
}

#[tauri::command]
pub async fn get_notifications() -> Result<Vec<DbNotification>, AppError> {
    let pool = get_pool();
    let rows = sqlx::query_as::<_, DbNotification>(
        "SELECT id, title, message, type, read, created_at
         FROM notifications ORDER BY created_at DESC LIMIT 50",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

#[tauri::command]
pub async fn save_notification(input: CreateNotificationInput) -> Result<DbNotification, AppError> {
    let pool = get_pool();
    let now  = Utc::now().to_rfc3339();
    let res  = sqlx::query(
        "INSERT INTO notifications (title, message, type, read, created_at) VALUES (?,?,?,0,?)",
    )
    .bind(&input.title)
    .bind(&input.message)
    .bind(&input.kind)
    .bind(&now)
    .execute(pool)
    .await?;
    let id = res.last_insert_rowid();
    let row = sqlx::query_as::<_, DbNotification>(
        "SELECT id, title, message, type, read, created_at FROM notifications WHERE id = ?",
    )
    .bind(id)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

#[tauri::command]
pub async fn mark_notifications_read() -> Result<(), AppError> {
    let pool = get_pool();
    sqlx::query("UPDATE notifications SET read = 1 WHERE read = 0")
        .execute(pool)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn clear_notifications() -> Result<(), AppError> {
    let pool = get_pool();
    sqlx::query("DELETE FROM notifications")
        .execute(pool)
        .await?;
    Ok(())
}

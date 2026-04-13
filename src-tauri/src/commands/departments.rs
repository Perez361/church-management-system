use crate::db::get_pool;
use crate::models::AppError;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Department {
    pub id:          String,
    pub name:        String,
    pub description: Option<String>,
    pub leader_id:   Option<String>,
    pub created_at:  String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDepartmentInput {
    pub name:        String,
    pub description: Option<String>,
    pub leader_id:   Option<String>,
}

#[tauri::command]
pub async fn get_departments() -> Result<Vec<Department>, AppError> {
    let pool = get_pool();
    let rows = sqlx::query_as::<_, Department>(
        "SELECT id, name, description, leader_id, created_at FROM departments ORDER BY name",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

#[tauri::command]
pub async fn create_department(input: CreateDepartmentInput) -> Result<Department, AppError> {
    let pool = get_pool();
    let id   = Uuid::new_v4().to_string();
    let now  = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO departments (id, name, description, leader_id, created_at)
         VALUES (?,?,?,?,?)",
    )
    .bind(&id)
    .bind(&input.name)
    .bind(&input.description)
    .bind(&input.leader_id)
    .bind(&now)
    .execute(pool)
    .await?;
    let row = sqlx::query_as::<_, Department>(
        "SELECT id, name, description, leader_id, created_at FROM departments WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

#[tauri::command]
pub async fn update_department(
    id: String,
    input: CreateDepartmentInput,
) -> Result<Department, AppError> {
    let pool = get_pool();
    sqlx::query(
        "UPDATE departments SET name = ?, description = ?, leader_id = ? WHERE id = ?",
    )
    .bind(&input.name)
    .bind(&input.description)
    .bind(&input.leader_id)
    .bind(&id)
    .execute(pool)
    .await?;
    let row = sqlx::query_as::<_, Department>(
        "SELECT id, name, description, leader_id, created_at FROM departments WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

#[tauri::command]
pub async fn delete_department(id: String) -> Result<bool, AppError> {
    let pool = get_pool();
    sqlx::query("DELETE FROM departments WHERE id = ?")
        .bind(&id)
        .execute(pool)
        .await?;
    Ok(true)
}

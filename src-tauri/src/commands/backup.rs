use crate::models::AppError;
use chrono::{Utc, Datelike};
use std::path::PathBuf;

fn downloads_dir() -> PathBuf {
    dirs::download_dir().unwrap_or_else(|| PathBuf::from("."))
}

fn db_path() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("church-cms")
        .join("church.db")
}

#[tauri::command]
pub async fn backup_database() -> Result<String, AppError> {
    let src = db_path();
    let now = Utc::now();
    let filename = format!(
        "church_cms_backup_{}{:02}{:02}.db",
        now.year(), now.month(), now.day()
    );
    let dest = downloads_dir().join(&filename);
    std::fs::copy(&src, &dest)
        .map_err(|e| AppError { message: e.to_string(), code: "BACKUP".into() })?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn restore_database(backup_path: String) -> Result<String, AppError> {
    let src  = PathBuf::from(&backup_path);
    let dest = db_path();

    if !src.exists() {
        return Err(AppError { message: "Backup file not found".into(), code: "RESTORE".into() });
    }

    // Validate it's a SQLite file (magic bytes: 53 51 4C 69 74 65)
    let magic = std::fs::read(&src)
        .map_err(|e| AppError { message: e.to_string(), code: "RESTORE".into() })?;
    if magic.len() < 6 || &magic[..6] != b"SQLite" {
        return Err(AppError { message: "File does not appear to be a SQLite database".into(), code: "RESTORE".into() });
    }

    std::fs::copy(&src, &dest)
        .map_err(|e| AppError { message: e.to_string(), code: "RESTORE".into() })?;

    Ok("Database restored. Please restart the application.".into())
}

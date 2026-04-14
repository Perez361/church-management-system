use crate::db::get_pool;
use crate::models::AppError;
use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AppSettings {
    pub currency:             String,
    pub date_format:          String,
    pub language:             String,
    pub notifications:        bool,
    pub auto_sync:            bool,
    pub show_sync_badge:      bool,
    pub weekly_summary:       bool,
    pub church_name:          String,
    pub supabase_url:         String,
    pub supabase_anon_key:    String,
}

impl Default for AppSettings {
    fn default() -> Self {
        AppSettings {
            currency:          "GHS".into(),
            date_format:       "DD/MM/YYYY".into(),
            language:          "English (Ghana)".into(),
            notifications:     true,
            auto_sync:         true,
            show_sync_badge:   true,
            weekly_summary:    false,
            church_name:       "Assemblies of God".into(),
            supabase_url:      String::new(),
            supabase_anon_key: String::new(),
        }
    }
}

async fn get_setting(pool: &sqlx::SqlitePool, key: &str) -> Option<String> {
    sqlx::query_as::<_, (String,)>("SELECT value FROM app_settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
        .map(|(v,)| v)
}

async fn set_setting(pool: &sqlx::SqlitePool, key: &str, value: &str) {
    let now = Utc::now().to_rfc3339();
    let _ = sqlx::query(
        "INSERT INTO app_settings (key, value, updated_at) VALUES (?,?,?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
    .bind(key)
    .bind(value)
    .bind(&now)
    .execute(pool)
    .await;
}

#[tauri::command]
pub async fn get_app_settings() -> Result<AppSettings, AppError> {
    let pool = get_pool();
    let def  = AppSettings::default();

    let settings = AppSettings {
        currency:          get_setting(pool, "currency").await.unwrap_or(def.currency),
        date_format:       get_setting(pool, "date_format").await.unwrap_or(def.date_format),
        language:          get_setting(pool, "language").await.unwrap_or(def.language),
        notifications:     get_setting(pool, "notifications").await.map(|v| v == "true").unwrap_or(def.notifications),
        auto_sync:         get_setting(pool, "auto_sync").await.map(|v| v == "true").unwrap_or(def.auto_sync),
        show_sync_badge:   get_setting(pool, "show_sync_badge").await.map(|v| v == "true").unwrap_or(def.show_sync_badge),
        weekly_summary:    get_setting(pool, "weekly_summary").await.map(|v| v == "true").unwrap_or(def.weekly_summary),
        church_name:       get_setting(pool, "church_name").await.unwrap_or(def.church_name),
        supabase_url:      get_setting(pool, "supabase_url").await.unwrap_or(def.supabase_url),
        supabase_anon_key: get_setting(pool, "supabase_anon_key").await.unwrap_or(def.supabase_anon_key),
    };
    Ok(settings)
}

#[tauri::command]
pub async fn save_app_settings(settings: AppSettings) -> Result<(), AppError> {
    let pool = get_pool();
    set_setting(pool, "currency",          &settings.currency).await;
    set_setting(pool, "date_format",       &settings.date_format).await;
    set_setting(pool, "language",          &settings.language).await;
    set_setting(pool, "notifications",     &settings.notifications.to_string()).await;
    set_setting(pool, "auto_sync",         &settings.auto_sync.to_string()).await;
    set_setting(pool, "show_sync_badge",   &settings.show_sync_badge.to_string()).await;
    set_setting(pool, "weekly_summary",    &settings.weekly_summary.to_string()).await;
    set_setting(pool, "church_name",       &settings.church_name).await;
    set_setting(pool, "supabase_url",      &settings.supabase_url).await;
    set_setting(pool, "supabase_anon_key", &settings.supabase_anon_key).await;
    Ok(())
}

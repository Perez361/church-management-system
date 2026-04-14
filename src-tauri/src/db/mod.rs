use once_cell::sync::OnceCell;
use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};
use std::path::PathBuf;

static DB_POOL: OnceCell<SqlitePool> = OnceCell::new();

pub async fn init_db() -> Result<(), sqlx::Error> {
    let db_path = get_db_path();

    // Ensure parent directory exists
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let db_url = format!(
        "sqlite:{}?mode=rwc",
        db_path.to_str().unwrap_or("church_cms.db")
    );

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    run_migrations(&pool).await?;
    DB_POOL.set(pool).ok();
    Ok(())
}

pub fn get_pool() -> &'static SqlitePool {
    DB_POOL.get().expect("Database not initialized")
}

fn get_db_path() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("church-cms")
        .join("church.db")
}

async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "PRAGMA journal_mode=WAL;
         PRAGMA foreign_keys=ON;",
    )
    .execute(pool)
    .await?;

    // Members
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS members (
            id              TEXT PRIMARY KEY,
            member_no       TEXT UNIQUE NOT NULL,
            first_name      TEXT NOT NULL,
            last_name       TEXT NOT NULL,
            date_of_birth   TEXT,
            gender          TEXT NOT NULL CHECK(gender IN ('male','female')),
            phone           TEXT,
            email           TEXT,
            address         TEXT,
            department_id   TEXT,
            membership_date TEXT NOT NULL,
            status          TEXT NOT NULL DEFAULT 'active'
                            CHECK(status IN ('active','inactive','transferred')),
            photo_url       TEXT,
            created_at      TEXT NOT NULL,
            updated_at      TEXT NOT NULL,
            deleted_at      TEXT,
            synced_at       TEXT
        )",
    )
    .execute(pool)
    .await?;

    // Tithe payments
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS tithe_payments (
            id              TEXT PRIMARY KEY,
            member_id       TEXT NOT NULL REFERENCES members(id),
            amount          REAL NOT NULL CHECK(amount > 0),
            payment_date    TEXT NOT NULL,
            period_month    INTEGER NOT NULL,
            period_year     INTEGER NOT NULL,
            payment_mode    TEXT NOT NULL
                            CHECK(payment_mode IN ('cash','mobile_money','bank_transfer','cheque')),
            reference_no    TEXT,
            received_by     TEXT NOT NULL,
            notes           TEXT,
            created_at      TEXT NOT NULL,
            synced_at       TEXT
        )",
    )
    .execute(pool)
    .await?;

    // Offerings
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS offerings (
            id              TEXT PRIMARY KEY,
            service_date    TEXT NOT NULL,
            service_type    TEXT NOT NULL,
            category        TEXT NOT NULL,
            total_amount    REAL NOT NULL CHECK(total_amount >= 0),
            currency        TEXT NOT NULL DEFAULT 'GHS',
            notes           TEXT,
            counted_by      TEXT,
            created_at      TEXT NOT NULL,
            synced_at       TEXT
        )",
    )
    .execute(pool)
    .await?;

    // Welfare contributions
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS welfare_contributions (
            id                  TEXT PRIMARY KEY,
            member_id           TEXT NOT NULL REFERENCES members(id),
            amount              REAL NOT NULL CHECK(amount > 0),
            contribution_date   TEXT NOT NULL,
            payment_mode        TEXT NOT NULL
                                CHECK(payment_mode IN ('cash','mobile_money','bank_transfer','cheque')),
            reference_no        TEXT,
            received_by         TEXT NOT NULL,
            created_at          TEXT NOT NULL,
            synced_at           TEXT
        )",
    )
    .execute(pool)
    .await?;

    // Welfare disbursements
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS welfare_disbursements (
            id                  TEXT PRIMARY KEY,
            beneficiary_id      TEXT NOT NULL REFERENCES members(id),
            amount              REAL NOT NULL CHECK(amount > 0),
            reason              TEXT NOT NULL,
            disbursement_date   TEXT NOT NULL,
            approved_by         TEXT NOT NULL,
            status              TEXT NOT NULL DEFAULT 'approved'
                                CHECK(status IN ('pending','approved','rejected')),
            created_at          TEXT NOT NULL,
            synced_at           TEXT
        )",
    )
    .execute(pool)
    .await?;

    // Sync queue
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS sync_queue (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            table_name  TEXT NOT NULL,
            record_id   TEXT NOT NULL,
            operation   TEXT NOT NULL CHECK(operation IN ('insert','update','delete')),
            payload     TEXT NOT NULL,
            status      TEXT NOT NULL DEFAULT 'pending'
                        CHECK(status IN ('pending','synced','failed')),
            retry_count INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL,
            synced_at   TEXT
        )",
    )
    .execute(pool)
    .await?;

    // Audit log
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS audit_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            table_name  TEXT NOT NULL,
            record_id   TEXT NOT NULL,
            action      TEXT NOT NULL,
            changed_by  TEXT NOT NULL,
            changed_at  TEXT NOT NULL,
            old_data    TEXT,
            new_data    TEXT
        )",
    )
    .execute(pool)
    .await?;

    // App settings (key-value store)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS app_settings (
            key         TEXT PRIMARY KEY,
            value       TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        )",
    )
    .execute(pool)
    .await?;

    // Member lifecycle events
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS member_events (
            id          TEXT PRIMARY KEY,
            member_id   TEXT NOT NULL REFERENCES members(id),
            event_type  TEXT NOT NULL,
            event_date  TEXT NOT NULL,
            notes       TEXT,
            created_at  TEXT NOT NULL
        )",
    )
    .execute(pool)
    .await?;

    // Departments
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS departments (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL UNIQUE,
            description TEXT,
            leader_id   TEXT REFERENCES members(id),
            created_at  TEXT NOT NULL
        )",
    )
    .execute(pool)
    .await?;

    // Seed default departments if empty
    sqlx::query(
        "INSERT OR IGNORE INTO departments (id, name, created_at) VALUES
         ('choir',         'Choir',         datetime('now')),
         ('ushers',        'Ushers',        datetime('now')),
         ('youth',         'Youth',         datetime('now')),
         ('elders',        'Elders',        datetime('now')),
         ('sunday_school', 'Sunday School', datetime('now'))",
    )
    .execute(pool)
    .await?;

    // Welfare disbursements: add beneficiary_type / beneficiary_name columns (idempotent)
    let _ = sqlx::query(
        "ALTER TABLE welfare_disbursements ADD COLUMN beneficiary_type TEXT NOT NULL DEFAULT 'member'",
    )
    .execute(pool)
    .await;
    let _ = sqlx::query(
        "ALTER TABLE welfare_disbursements ADD COLUMN beneficiary_name TEXT",
    )
    .execute(pool)
    .await;

    // Notifications persistence
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS notifications (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            message     TEXT NOT NULL,
            type        TEXT NOT NULL DEFAULT 'info',
            read        INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL
        )",
    )
    .execute(pool)
    .await?;

    Ok(())
}
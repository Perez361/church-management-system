pub mod db;
pub mod models;
pub mod sync;
pub mod commands {
    pub mod members;
    pub mod tithe;
    pub mod offerings;
    pub mod welfare;
    pub mod dashboard;
    pub mod export;
    pub mod settings;
    pub mod departments;
    pub mod events;
    pub mod notifications;
    pub mod backup;
}

use commands::{
    members::*,
    tithe::*,
    offerings::*,
    welfare::*,
    dashboard::*,
    export::*,
    settings::*,
    departments::*,
    events::*,
    notifications::*,
    backup::*,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            // ── 1. Init local SQLite database ─────────────────────────
            tauri::async_runtime::block_on(async {
                db::init_db().await.expect("Failed to initialise database");
                println!("✅ Database ready");
            });

            // ── 2. Attempt a sync 3 seconds after startup ─────────────
            tauri::async_runtime::spawn(async {
                tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                println!("🚀 Running startup sync…");
                sync::run_sync().await;
            });

            // ── 3. Background sync loop — every 60 seconds ────────────
            tauri::async_runtime::spawn(async {
                let mut interval =
                    tokio::time::interval(tokio::time::Duration::from_secs(60));
                interval.tick().await; // skip immediate first tick
                loop {
                    interval.tick().await;
                    println!("⏱  Running scheduled sync…");
                    sync::run_sync().await;
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Members
            get_members,
            get_member,
            create_member,
            update_member,
            delete_member,
            get_member_count,
            // Tithe
            get_tithe_payments,
            create_tithe_payment,
            get_tithe_summary,
            // Offerings
            get_offerings,
            create_offering,
            get_offerings_summary,
            // Welfare
            get_welfare_contributions,
            create_welfare_contribution,
            get_welfare_disbursements,
            create_welfare_disbursement,
            update_disbursement_status,
            get_welfare_balance,
            // Dashboard
            get_dashboard_stats,
            get_sync_pending_count,
            trigger_sync,
            get_sync_stats,
            get_sync_queue_items,
            // Export
            export_members_excel,
            export_tithe_excel,
            export_offerings_excel,
            export_welfare_excel,
            get_export_summary,
            // Settings
            get_app_settings,
            save_app_settings,
            // Departments
            get_departments,
            create_department,
            update_department,
            delete_department,
            // Member lifecycle events
            get_member_events,
            create_member_event,
            delete_member_event,
            // Notifications persistence
            get_notifications,
            save_notification,
            mark_notifications_read,
            clear_notifications,
            // Backup / restore
            backup_database,
            restore_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
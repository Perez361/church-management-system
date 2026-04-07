pub mod db;
pub mod models;
pub mod commands {
    pub mod members;
    pub mod tithe;
    pub mod offerings;
    pub mod welfare;
    pub mod dashboard;
}

use commands::{members::*, tithe::*, offerings::*, welfare::*, dashboard::*};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            tauri::async_runtime::block_on(async {
                db::init_db().await.expect("Failed to initialize database");
                println!("✅ Database initialized");
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
            get_welfare_balance,
            // Dashboard
            get_dashboard_stats,
            get_sync_pending_count,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
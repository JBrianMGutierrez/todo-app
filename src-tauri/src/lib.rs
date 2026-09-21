mod db;
use db::*;

use tauri::Manager;
use tauri_plugin_log::Builder;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/#[tauri::command]
#[tauri::command]
fn greet(name: &str) -> String {
    format!("{} for me!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let db = get_conn(app.handle());
            app.manage(db);
            Ok(())
        })
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(Builder::new().level(log::LevelFilter::Info).build())
        .invoke_handler(tauri::generate_handler![
            greet,
            insert_task,
            load_tasks,
            complete_task,
            delete_task,
            update_task,
            get_balance,
            get_dashboard_stats,
            get_grouped_transactions
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

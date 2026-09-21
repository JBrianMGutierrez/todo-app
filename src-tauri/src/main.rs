// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use chrono::prelude::*;

fn main() {
    println!("RUST TIME: {}", Utc::now());
    todo_app_lib::run()
}

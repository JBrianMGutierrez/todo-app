use chrono::prelude::*;
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::Manager;

use std::sync::Mutex;
use tauri::State;

pub struct DbState {
    pub conn: Mutex<Connection>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub completed: bool,
    pub completed_at: Option<String>,
    pub amount: Option<f64>,
    pub r#type: String,
    pub bill: bool,
    pub scheduled_date: Option<String>,
    pub recurring: Option<bool>,
    pub recurring_days: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TaskInput {
    pub id: String,
    pub title: String,
    pub amount: Option<f64>,
    pub r#type: String,
    pub bill: bool,
    pub scheduled_date: Option<String>,
    pub recurring: bool,
    pub recurring_days: Option<i64>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    due_today: i32,
    overdue: i32,
    monthly_income: f64,
    monthly_expenses: f64,
    upcoming_expense: f64,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionItem {
    pub title: String,
    pub amount: f64,
}

#[derive(serde::Serialize)]
pub struct TypeGroup {
    pub group_type: String, // "income" | "expense"
    pub items: Vec<TransactionItem>,
}

#[derive(serde::Serialize)]
pub struct MonthGroup {
    pub month: String,
    pub groups: Vec<TypeGroup>,
}

pub fn get_conn(app: &tauri::AppHandle) -> DbState {
    let path = app.path().app_data_dir().unwrap().join("todo.db");

    let conn = Connection::open(path).unwrap();

    conn.execute(
        "CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            completed INTEGER NOT NULL,
            completed_at TEXT,
            amount REAL,
            type TEXT NOT NULL,
            scheduled_date TEXT,
            recurring INTEGER,
            recurring_days INTEGER
        )",
        [],
    )
    .unwrap();

    conn.execute(
        "ALTER TABLE tasks
        ADD COLUMN bill INTEGER NOT NULL DEFAULT 0",
        [],
    )
    .ok();

    DbState {
        conn: Mutex::new(conn),
    }
}

#[tauri::command]
pub fn insert_task(state: tauri::State<DbState>, task: TaskInput) -> Result<(), String> {
    println!("insert task called");
    println!("{:?}", task);

    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "
        INSERT INTO tasks (
            id,
            title,
            completed,
            completed_at,
            amount,
            type,
            bill,
            scheduled_date,
            recurring,
            recurring_days
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        ",
        (
            task.id,
            task.title,
            0,
            Option::<String>::None,
            task.amount,
            task.r#type,
            task.bill,
            task.scheduled_date,
            if task.recurring { 1 } else { 0 },
            task.recurring_days,
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn load_tasks(
    state: State<DbState>,
    filter: Option<String>,
    today: Option<String>,
) -> Result<Vec<Task>, String> {
    let mut params = Vec::new();
    let query = match filter.as_deref().unwrap_or("all") {
        "all" => "SELECT * FROM tasks",
        "today" => {
            params.push(today.ok_or("The today filter requires a date")?);
            "SELECT * FROM tasks WHERE scheduled_date = ?1"
        }
        "pending" => "SELECT * FROM tasks WHERE completed = 0",
        "completed" => "SELECT * FROM tasks WHERE completed = 1",
        task_type @ ("income" | "expense" | "normal") => {
            params.push(task_type.to_string());
            "SELECT * FROM tasks WHERE type = ?1"
        }
        _ => return Err("Invalid task filter".to_string()),
    };

    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params_from_iter(params), |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                completed: row.get(2)?,
                completed_at: row.get(3)?,
                amount: row.get(4)?,
                r#type: row.get(5)?,
                scheduled_date: row.get(6)?,
                recurring: row.get(7)?,
                recurring_days: row.get(8)?,
                bill: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut tasks = vec![];

    for task in rows {
        tasks.push(task.map_err(|e| e.to_string())?);
    }

    Ok(tasks)
}

#[tauri::command]
pub fn complete_task(
    state: State<DbState>,
    id: String,
    is_completed: bool,
    today: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE tasks
        SET completed = ?1,
        completed_at = ?2
        WHERE id = ?3",
        (
            is_completed,
            if is_completed {
                Some(today)
            } else {
                None::<String>
            },
            id,
        ),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_task(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM tasks WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn update_task(state: State<DbState>, task: Task) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE tasks
        SET
        title = ?,
        amount = ?,
        type = ?,
        bill = ?,
        scheduled_date = ?,
        recurring = ?,
        recurring_days = ?
        WHERE id = ?",
        (
            task.title,
            task.amount,
            task.r#type,
            task.bill,
            task.scheduled_date,
            task.recurring,
            task.recurring_days,
            task.id,
        ),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_balance(state: State<DbState>) -> Result<f64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "
            SELECT COALESCE(SUM
            (CASE
                WHEN type = 'income' THEN amount
                WHEN type = 'expense' THEN -amount
                ELSE 0
            END),
            0) as balance
            FROM tasks
            WHERE completed = 1
            ",
        )
        .map_err(|e| e.to_string())?;

    let balance: f64 = stmt.query_row([], |row| row.get(0)).unwrap_or(0.0);

    Ok(balance)
}

#[tauri::command]
pub fn get_dashboard_stats(state: State<DbState>) -> Result<DashboardStats, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let stats = conn
        .query_row(
            r#"
            SELECT
                -- Due today
                SUM(
                    CASE
                        WHEN completed = 0
                        AND scheduled_date = date('now')
                        THEN 1 ELSE 0
                    END
                ) AS due_today,

                -- Overdue
                SUM(
                    CASE
                        WHEN completed = 0
                        AND scheduled_date < date('now')
                        THEN 1 ELSE 0
                    END
                ) AS overdue,

                -- Monthly income
                COALESCE(
                    SUM(
                        CASE
                            WHEN completed = 1
                                AND type = 'income'
                                AND strftime('%Y-%m', substr(completed_at, 1, 10)) = strftime('%Y-%m', 'now')
                            THEN amount ELSE 0
                        END
                    ), 0
                ) AS monthly_income,

                -- Monthly expenses (expense + bill)
                COALESCE(
                    SUM(
                        CASE
                            WHEN completed = 1
                            AND (
                                type = 'expense'
                                OR bill = 1
                            )
                            AND strftime('%Y-%m', completed_at) = strftime('%Y-%m', 'now')
                            THEN amount ELSE 0
                        END
                    ), 0
                ) AS monthly_expenses,
                -- Monthly upcoming expenses
                COALESCE(
                    SUM(
                        CASE
                            WHEN completed = 0
                                AND type = 'expense'
                                AND strftime('%Y-%m', scheduled_date) = strftime('%Y-%m', 'now')
                            THEN amount ELSE 0
                        END
                    ), 0
                ) AS upcoming_expense_month

            FROM tasks;
            "#,
            [],
            |row| {
                Ok(DashboardStats {
                    due_today: row.get(0)?,
                    overdue: row.get(1)?,
                    monthly_income: row.get(2)?,
                    monthly_expenses: row.get(3)?,
                    upcoming_expense: row.get(4)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(stats)
}

#[tauri::command]
pub fn get_grouped_transactions(state: State<DbState>) -> Result<Vec<MonthGroup>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "
            SELECT title, amount, type, completed_at, scheduled_date
            FROM tasks
            WHERE completed = 1
            ORDER BY COALESCE(completed_at, scheduled_date) DESC
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, f64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut map: HashMap<String, HashMap<String, Vec<TransactionItem>>> = HashMap::new();

    for r in rows {
        let (title, amount, ttype, completed_at, scheduled) = r.map_err(|e| e.to_string())?;

        let date_str = completed_at.unwrap_or(scheduled);

        let parsed_date = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d")
            .unwrap_or_else(|_| NaiveDate::from_ymd_opt(1970, 1, 1).unwrap());

        let month = parsed_date.format("%B %Y").to_string();

        map.entry(month)
            .or_default()
            .entry(ttype)
            .or_default()
            .push(TransactionItem { title, amount });
    }

    let mut result: Vec<MonthGroup> = map
        .into_iter()
        .map(|(month, mut groups)| {
            let mut ordered_groups: Vec<TypeGroup> = Vec::new();

            if let Some(income_items) = groups.remove("income") {
                ordered_groups.push(TypeGroup {
                    group_type: "income".to_string(),
                    items: income_items,
                });
            }

            if let Some(expense_items) = groups.remove("expense") {
                ordered_groups.push(TypeGroup {
                    group_type: "expense".to_string(),
                    items: expense_items,
                });
            }

            for (k, v) in groups {
                ordered_groups.push(TypeGroup {
                    group_type: k,
                    items: v,
                });
            }

            MonthGroup {
                month,
                groups: ordered_groups,
            }
        })
        .collect();

    result.sort_by(|a, b| {
        let date_a = chrono::NaiveDate::parse_from_str(&format!("01 {}", a.month), "%d %B %Y")
            .unwrap_or_else(|_| chrono::NaiveDate::from_ymd_opt(1970, 1, 1).unwrap());

        let date_b = chrono::NaiveDate::parse_from_str(&format!("01 {}", b.month), "%d %B %Y")
            .unwrap_or_else(|_| chrono::NaiveDate::from_ymd_opt(1970, 1, 1).unwrap());

        date_b.cmp(&date_a)
    });

    Ok(result)
}

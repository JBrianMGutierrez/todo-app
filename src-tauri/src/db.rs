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
    pub due_date: Option<String>,
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
    pub due_date: Option<String>,
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

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionHistory {
    pub months: Vec<MonthGroup>,
    pub has_more: bool,
}

pub fn get_conn(app: &tauri::AppHandle) -> DbState {
    let path = app.path().app_data_dir().unwrap().join("todo.db");

    let conn = Connection::open(path).unwrap();
    initialize_schema(&conn).expect("Failed to initialize task database");

    DbState {
        conn: Mutex::new(conn),
    }
}

fn initialize_schema(conn: &Connection) -> Result<()> {
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
    )?;

    let columns = conn
        .prepare("PRAGMA table_info(tasks)")?
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>>>()?;
    if !columns.iter().any(|column| column == "bill") {
        conn.execute(
            "ALTER TABLE tasks ADD COLUMN bill INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }
    if !columns.iter().any(|column| column == "due_date") {
        conn.execute("ALTER TABLE tasks ADD COLUMN due_date TEXT", [])?;
    }
    Ok(())
}

fn philippines_date(instant: DateTime<Utc>) -> NaiveDate {
    instant
        .with_timezone(&FixedOffset::east_opt(8 * 60 * 60).expect("UTC+8 is a valid offset"))
        .date_naive()
}

fn parse_date(value: &str, field: &str) -> Result<NaiveDate, String> {
    let bytes = value.as_bytes();
    if bytes.len() != 10
        || bytes.iter().enumerate().any(|(index, byte)| {
            if index == 4 || index == 7 {
                *byte != b'-'
            } else {
                !byte.is_ascii_digit()
            }
        })
    {
        return Err(format!("{field} must be a valid date in YYYY-MM-DD format"));
    }
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| format!("{field} must be a valid date in YYYY-MM-DD format"))
}

fn validate_due_date(
    task_type: &str,
    bill: bool,
    recurring: bool,
    scheduled_date: Option<&str>,
    due_date: Option<&str>,
) -> Result<(), String> {
    let Some(due_date) = due_date else {
        return Ok(());
    };
    if task_type != "expense" || !(bill || recurring) {
        return Err("Due date is only allowed for bill or recurring expenses".to_string());
    }
    let due = parse_date(due_date, "Due date")?;
    if let Some(scheduled_date) = scheduled_date {
        if due < parse_date(scheduled_date, "Scheduled date")? {
            return Err("Due date must be on or after scheduled date".to_string());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn insert_task(state: tauri::State<DbState>, task: TaskInput) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    insert_task_with_conn(&conn, task)
}

fn insert_task_with_conn(conn: &Connection, task: TaskInput) -> Result<(), String> {
    validate_due_date(
        &task.r#type,
        task.bill,
        task.recurring,
        task.scheduled_date.as_deref(),
        task.due_date.as_deref(),
    )?;

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
            recurring_days,
            due_date
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
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
            task.due_date,
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
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    load_tasks_with_conn(&conn, filter, today)
}

fn load_tasks_with_conn(
    conn: &Connection,
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
                due_date: row.get("due_date")?,
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
pub fn complete_task(state: State<DbState>, id: String, is_completed: bool) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    complete_task_with_conn(&conn, &id, is_completed, Utc::now())
}

fn complete_task_with_conn(
    conn: &Connection,
    id: &str,
    is_completed: bool,
    instant: DateTime<Utc>,
) -> Result<(), String> {
    conn.execute(
        "UPDATE tasks
        SET completed = ?1,
        completed_at = ?2
        WHERE id = ?3",
        (
            is_completed,
            if is_completed {
                Some(philippines_date(instant).format("%Y-%m-%d").to_string())
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
    update_task_with_conn(&conn, task)
}

fn update_task_with_conn(conn: &Connection, task: Task) -> Result<(), String> {
    validate_due_date(
        &task.r#type,
        task.bill,
        task.recurring.unwrap_or(false),
        task.scheduled_date.as_deref(),
        task.due_date.as_deref(),
    )?;

    conn.execute(
        "UPDATE tasks
        SET
        title = ?,
        amount = ?,
        type = ?,
        bill = ?,
        scheduled_date = ?,
        recurring = ?,
        recurring_days = ?,
        due_date = ?
        WHERE id = ?",
        (
            task.title,
            task.amount,
            task.r#type,
            task.bill,
            task.scheduled_date,
            task.recurring,
            task.recurring_days,
            task.due_date,
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
    get_dashboard_stats_with_conn(&conn, philippines_date(Utc::now()))
}

fn get_dashboard_stats_with_conn(
    conn: &Connection,
    today: NaiveDate,
) -> Result<DashboardStats, String> {
    let month = today.format("%Y-%m").to_string();
    let today = today.format("%Y-%m-%d").to_string();
    let stats = conn
        .query_row(
            r#"
            SELECT
                -- Due today
                SUM(
                    CASE
                        WHEN completed = 0
                        AND scheduled_date = ?1
                        THEN 1 ELSE 0
                    END
                ) AS due_today,

                -- Overdue
                SUM(
                    CASE
                        WHEN completed = 0
                        AND scheduled_date < ?1
                        THEN 1 ELSE 0
                    END
                ) AS overdue,

                -- Monthly income
                COALESCE(
                    SUM(
                        CASE
                            WHEN completed = 1
                                AND type = 'income'
                                AND strftime('%Y-%m', substr(completed_at, 1, 10)) = ?2
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
                            AND strftime('%Y-%m', completed_at) = ?2
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
                                AND strftime('%Y-%m', scheduled_date) = ?2
                            THEN amount ELSE 0
                        END
                    ), 0
                ) AS upcoming_expense_month

            FROM tasks;
            "#,
            rusqlite::params![today, month],
            |row| {
                Ok(DashboardStats {
                    due_today: row.get::<_, Option<i32>>(0)?.unwrap_or(0),
                    overdue: row.get::<_, Option<i32>>(1)?.unwrap_or(0),
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
pub fn get_grouped_transactions(
    state: State<DbState>,
    months: u32,
) -> Result<TransactionHistory, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    get_grouped_transactions_with_conn(&conn, months, philippines_date(Utc::now()))
}

fn get_grouped_transactions_with_conn(
    conn: &Connection,
    months: u32,
    today: NaiveDate,
) -> Result<TransactionHistory, String> {
    let preceding_months = months.checked_sub(1).ok_or("months must be at least 1")?;
    let current_month = today.with_day(1).ok_or("Invalid current month")?;
    let start = current_month
        .checked_sub_months(chrono::Months::new(preceding_months))
        .ok_or("months exceeds the supported date range")?;
    let end = current_month
        .checked_add_months(chrono::Months::new(1))
        .ok_or("Next month exceeds the supported date range")?;
    // Fixed-width dates keep SQLite's lexical comparisons chronological.
    if start.year() < 0 || end.year() > 9999 {
        return Err("Month window exceeds the supported YYYY-MM-DD date range".to_string());
    }
    let start = start.format("%Y-%m-%d").to_string();
    let end = end.format("%Y-%m-%d").to_string();
    let valid_transactions = "
        WITH transactions AS (
            SELECT title, amount, type,
                COALESCE(completed_at, scheduled_date) AS effective_date,
                substr(COALESCE(completed_at, scheduled_date), 1, 10) AS day
            FROM tasks
            WHERE completed = 1
                AND type IN ('income', 'expense')
                AND amount IS NOT NULL
        ), valid_transactions AS (
            SELECT * FROM transactions
            WHERE day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
                AND date(day, '+0 days') = day
        )";
    let has_more = conn
        .query_row(
            &format!("{valid_transactions} SELECT EXISTS(SELECT 1 FROM valid_transactions WHERE day < ?1)"),
            [&start],
            |row| row.get::<_, bool>(0),
        )
        .map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(&format!(
            "{valid_transactions}
            SELECT title, amount, type, day
            FROM valid_transactions
            WHERE day >= ?1 AND day < ?2
            ORDER BY effective_date DESC"
        ))
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params![start, end], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, f64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut map: HashMap<String, HashMap<String, Vec<TransactionItem>>> = HashMap::new();

    for r in rows {
        let (title, amount, ttype, date_str) = r.map_err(|e| e.to_string())?;
        let parsed_date = parse_date(&date_str, "Transaction date")?;

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

    Ok(TransactionHistory {
        months: result,
        has_more,
    })
}

#[cfg(test)]
mod transaction_tests {
    use super::*;

    fn utc(value: &str) -> DateTime<Utc> {
        DateTime::parse_from_rfc3339(value)
            .unwrap()
            .with_timezone(&Utc)
    }

    #[test]
    fn philippines_date_rolls_over_at_utc_16() {
        for (before, boundary, previous, next) in [
            (
                "2026-10-17T15:59:59Z",
                "2026-10-17T16:00:00Z",
                "2026-10-17",
                "2026-10-18",
            ),
            (
                "2024-02-29T15:59:59Z",
                "2024-02-29T16:00:00Z",
                "2024-02-29",
                "2024-03-01",
            ),
            (
                "2026-12-31T15:59:59Z",
                "2026-12-31T16:00:00Z",
                "2026-12-31",
                "2027-01-01",
            ),
        ] {
            assert_eq!(philippines_date(utc(before)).to_string(), previous);
            assert_eq!(philippines_date(utc(boundary)).to_string(), next);
        }
    }

    #[test]
    fn completion_stores_ph_date_and_preserves_calendar_dates() {
        let conn = history_db();
        add_transaction(&conn, "task", None, Some("2026-12-31"));
        for (instant, expected) in [
            ("2026-12-31T15:59:59Z", "2026-12-31"),
            ("2026-12-31T16:00:00Z", "2027-01-01"),
        ] {
            complete_task_with_conn(&conn, "task", true, utc(instant)).unwrap();
            let task = load_tasks_with_conn(&conn, None, None)
                .unwrap()
                .pop()
                .unwrap();
            assert!(task.completed);
            assert_eq!(task.completed_at.as_deref(), Some(expected));
            assert_eq!(task.scheduled_date.as_deref(), Some("2026-12-31"));
        }
        complete_task_with_conn(&conn, "task", false, utc("2027-01-01T00:00:00Z")).unwrap();
        let task = load_tasks_with_conn(&conn, None, None)
            .unwrap()
            .pop()
            .unwrap();
        assert!(!task.completed);
        assert_eq!(task.completed_at, None);
    }

    #[test]
    fn dashboard_uses_ph_day_and_month_boundaries() {
        for (before, boundary, previous, next) in [
            (
                "2026-10-17T15:59:59Z",
                "2026-10-17T16:00:00Z",
                "2026-10-17",
                "2026-10-18",
            ),
            (
                "2024-02-29T15:59:59Z",
                "2024-02-29T16:00:00Z",
                "2024-02-29",
                "2024-03-01",
            ),
            (
                "2026-12-31T15:59:59Z",
                "2026-12-31T16:00:00Z",
                "2026-12-31",
                "2027-01-01",
            ),
        ] {
            let conn = history_db();
            for (id, date, amount) in [("previous", previous, 10), ("next", next, 20)] {
                conn.execute(
                    "INSERT INTO tasks (id, title, completed, scheduled_date, amount, type)
                     VALUES (?1, ?1, 0, ?2, ?3, 'expense')",
                    rusqlite::params![id, date, amount],
                )
                .unwrap();
                for kind in ["income", "expense"] {
                    conn.execute(
                        "INSERT INTO tasks (id, title, completed, completed_at, amount, type)
                         VALUES (?1, ?1, 1, ?2, ?3, ?4)",
                        rusqlite::params![format!("{id}-{kind}"), date, amount, kind],
                    )
                    .unwrap();
                }
            }
            for (instant, overdue, monthly) in [
                (
                    before,
                    0,
                    if previous[..7] == next[..7] {
                        30.0
                    } else {
                        10.0
                    },
                ),
                (
                    boundary,
                    1,
                    if previous[..7] == next[..7] {
                        30.0
                    } else {
                        20.0
                    },
                ),
            ] {
                let date = philippines_date(utc(instant));
                let stats = get_dashboard_stats_with_conn(&conn, date).unwrap();
                assert_eq!(stats.due_today, 1);
                assert_eq!(stats.overdue, overdue);
                assert_eq!(stats.monthly_income, monthly);
                assert_eq!(stats.monthly_expenses, monthly);
                assert_eq!(stats.upcoming_expense, monthly);
                let history = get_grouped_transactions_with_conn(&conn, 1, date).unwrap();
                assert_eq!(history.months[0].month, date.format("%B %Y").to_string());
            }
        }
    }

    #[test]
    fn empty_dashboard_returns_zeroes() {
        let stats = get_dashboard_stats_with_conn(&history_db(), today()).unwrap();
        assert_eq!((stats.due_today, stats.overdue), (0, 0));
        assert_eq!(stats.monthly_income, 0.0);
        assert_eq!(stats.monthly_expenses, 0.0);
        assert_eq!(stats.upcoming_expense, 0.0);
    }

    fn today() -> NaiveDate {
        NaiveDate::from_ymd_opt(2026, 10, 17).unwrap()
    }

    fn history_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        initialize_schema(&conn).unwrap();
        conn
    }

    fn add_transaction(
        conn: &Connection,
        id: &str,
        completed: Option<&str>,
        scheduled: Option<&str>,
    ) {
        conn.execute(
            "INSERT INTO tasks (id, title, completed, completed_at, scheduled_date, amount, type)
             VALUES (?1, ?1, 1, ?2, ?3, 10, 'expense')",
            rusqlite::params![id, completed, scheduled],
        )
        .unwrap();
    }

    #[test]
    fn calendar_window_boundaries_and_timestamp_ordering() {
        let conn = history_db();
        for (id, date) in [
            ("older", "2026-08-31T23:59:59"),
            ("start", "2026-09-01T00:00:00"),
            ("current", "2026-10-01"),
            ("last", "2026-10-31T23:59:59"),
            ("next", "2026-11-01T00:00:00"),
        ] {
            add_transaction(&conn, id, Some(date), None);
        }
        add_transaction(&conn, "fallback", None, Some("2026-09-30T12:00:00"));
        add_transaction(
            &conn,
            "completion_wins",
            Some("2026-11-02"),
            Some("2026-10-01"),
        );
        let history = get_grouped_transactions_with_conn(&conn, 2, today()).unwrap();
        assert!(history.has_more);
        assert_eq!(history.months.len(), 2);
        assert_eq!(history.months[0].month, "October 2026");
        assert_eq!(history.months[1].month, "September 2026");
        let titles: Vec<_> = history
            .months
            .iter()
            .flat_map(|m| &m.groups)
            .flat_map(|g| &g.items)
            .map(|i| i.title.as_str())
            .collect();
        assert_eq!(titles, ["last", "current", "fallback", "start"]);
        let one = get_grouped_transactions_with_conn(&conn, 1, today()).unwrap();
        assert_eq!(one.months.len(), 1);
        assert!(one.has_more);
    }

    #[test]
    fn year_rollover_and_leap_day() {
        let conn = history_db();
        add_transaction(&conn, "december", Some("2023-12-31"), None);
        add_transaction(&conn, "january", Some("2024-01-01"), None);
        add_transaction(&conn, "leap", Some("2024-02-29T12:00:00"), None);
        let january = NaiveDate::from_ymd_opt(2024, 1, 31).unwrap();
        let history = get_grouped_transactions_with_conn(&conn, 2, january).unwrap();
        assert_eq!(history.months.len(), 2);
        assert_eq!(history.months[0].month, "January 2024");
        assert_eq!(history.months[1].month, "December 2023");
        assert!(!history.has_more);
        let february = NaiveDate::from_ymd_opt(2024, 2, 29).unwrap();
        let history = get_grouped_transactions_with_conn(&conn, 1, february).unwrap();
        assert_eq!(history.months[0].groups[0].items[0].title, "leap");
        assert!(history.has_more);
    }

    #[test]
    fn older_availability_requires_valid_qualifying_transactions() {
        let conn = history_db();
        for date in [
            "",
            "garbage",
            "2026-02-30",
            "2025-02-29",
            "2026-00-01",
            "2026-13-01",
            "2026-09-31",
        ] {
            add_transaction(&conn, date, Some(date), Some("2026-01-01"));
        }
        add_transaction(&conn, "undated", None, None);
        conn.execute_batch(
            "INSERT INTO tasks (id, title, completed, completed_at, amount, type) VALUES
             ('normal', 'Normal', 1, '2026-01-01', 10, 'normal'),
             ('missing', 'Missing amount', 1, '2026-01-01', NULL, 'income'),
             ('pending', 'Pending', 0, '2026-01-01', 10, 'expense');",
        )
        .unwrap();
        let history = get_grouped_transactions_with_conn(&conn, 2, today()).unwrap();
        assert!(history.months.is_empty());
        assert!(!history.has_more);
        add_transaction(&conn, "older", None, Some("2026-08-31T23:59:59"));
        assert!(
            get_grouped_transactions_with_conn(&conn, 2, today())
                .unwrap()
                .has_more
        );
    }

    #[test]
    fn empty_gaps_do_not_change_calendar_window() {
        let conn = history_db();
        add_transaction(&conn, "april", Some("2026-04-15"), None);
        let initial = get_grouped_transactions_with_conn(&conn, 2, today()).unwrap();
        assert!(initial.months.is_empty());
        assert!(initial.has_more);
        let extended = get_grouped_transactions_with_conn(&conn, 7, today()).unwrap();
        assert_eq!(extended.months.len(), 1);
        assert_eq!(extended.months[0].month, "April 2026");
        assert!(!extended.has_more);
        let json = serde_json::to_value(extended).unwrap();
        assert_eq!(json["hasMore"], false);
        assert!(json["months"].is_array());
    }

    #[test]
    fn invalid_counts_and_date_overflow_return_errors() {
        let conn = history_db();
        for months in [0, u32::MAX] {
            assert!(get_grouped_transactions_with_conn(&conn, months, today()).is_err());
        }
        assert!(get_grouped_transactions_with_conn(&conn, 1, NaiveDate::MAX).is_err());
        assert!(get_grouped_transactions_with_conn(&conn, 2, NaiveDate::MIN).is_err());
        let early = NaiveDate::from_ymd_opt(1, 1, 1).unwrap();
        assert!(get_grouped_transactions_with_conn(&conn, 25, early).is_err());
    }

    #[test]
    fn transaction_history_ignores_normal_tasks_and_missing_amounts() {
        let conn = Connection::open_in_memory().unwrap();
        initialize_schema(&conn).unwrap();
        conn.execute_batch(
            "INSERT INTO tasks (id, title, completed, completed_at, amount, type, scheduled_date)
             VALUES
                ('normal', 'Chore', 1, '2026-10-17', NULL, 'normal', NULL),
                ('bill', 'Unknown bill', 1, '2026-10-17', NULL, 'expense', NULL),
                ('pending', 'Pending expense', 0, NULL, 10, 'expense', '2026-10-17'),
                ('income', 'Salary', 1, '2026-10-17', 100, 'income', NULL),
                ('expense', 'Groceries', 1, NULL, 25, 'expense', '2026-10-17');",
        )
        .unwrap();

        let history = get_grouped_transactions_with_conn(&conn, 2, today()).unwrap();
        assert!(!history.has_more);
        let months = history.months;
        assert_eq!(months.len(), 1);
        assert_eq!(months[0].month, "October 2026");
        let groups = &months[0].groups;
        assert_eq!(groups.len(), 2);
        assert_eq!(groups[0].group_type, "income");
        assert_eq!(groups[0].items.len(), 1);
        assert_eq!(groups[0].items[0].amount, 100.0);
        assert_eq!(groups[1].group_type, "expense");
        assert_eq!(groups[1].items.len(), 1);
        assert_eq!(groups[1].items[0].amount, 25.0);
    }

    #[test]
    fn transaction_history_without_financial_tasks_is_empty() {
        let conn = Connection::open_in_memory().unwrap();
        initialize_schema(&conn).unwrap();
        conn.execute_batch(
            "INSERT INTO tasks (id, title, completed, amount, type)
             VALUES ('normal', 'Chore', 1, NULL, 'normal');",
        )
        .unwrap();
        let history = get_grouped_transactions_with_conn(&conn, 2, today()).unwrap();
        assert!(history.months.is_empty());
        assert!(!history.has_more);
    }
}

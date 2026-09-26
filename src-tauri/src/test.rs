mod db;
use db::*;

#[cfg(test)]
mod tests {
    use serde_json::json;

    fn input() -> TaskInput {
        serde_json::from_value(json!({
            "id": "expense-1",
            "title": "Electricity",
            "amount": 42.5,
            "type": "expense",
            "bill": true,
            "scheduledDate": "2024-02-01",
            "recurring": false,
            "dueDate": "2024-02-29"
        }))
        .unwrap()
    }

    fn database() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        initialize_schema(&conn).unwrap();
        conn
    }

    fn loaded_task(conn: &Connection) -> Task {
        let mut tasks = load_tasks_with_conn(conn, None, None).unwrap();
        assert_eq!(tasks.len(), 1);
        tasks.remove(0)
    }

    #[test]
    fn due_date_migration_preserves_legacy_rows_and_is_repeatable() {
        for has_bill in [false, true] {
            let conn = Connection::open_in_memory().unwrap();
            conn.execute_batch(
                "CREATE TABLE tasks (
                    id TEXT PRIMARY KEY, title TEXT NOT NULL,
                    completed INTEGER NOT NULL, completed_at TEXT,
                    amount REAL, type TEXT NOT NULL, scheduled_date TEXT,
                    recurring INTEGER, recurring_days INTEGER
                );
                INSERT INTO tasks VALUES (
                    'legacy', 'Existing expense', 1, '2024-02-02',
                    12.5, 'expense', '2024-02-01', 1, 30
                );",
            )
            .unwrap();
            if has_bill {
                conn.execute_batch(
                    "ALTER TABLE tasks ADD COLUMN bill INTEGER NOT NULL DEFAULT 0;
                     UPDATE tasks SET bill = 1;",
                )
                .unwrap();
            }
            initialize_schema(&conn).unwrap();
            initialize_schema(&conn).unwrap();
            let task = loaded_task(&conn);
            assert_eq!(task.id, "legacy");
            assert_eq!(task.title, "Existing expense");
            assert!(task.completed);
            assert_eq!(task.completed_at.as_deref(), Some("2024-02-02"));
            assert_eq!(task.amount, Some(12.5));
            assert_eq!(task.r#type, "expense");
            assert_eq!(task.scheduled_date.as_deref(), Some("2024-02-01"));
            assert_eq!(task.recurring, Some(true));
            assert_eq!(task.recurring_days, Some(30));
            assert_eq!(task.bill, has_bill);
            assert_eq!(task.due_date, None);

            let mut task = task;
            task.due_date = Some("2024-02-29".into());
            update_task_with_conn(&conn, task).unwrap();
            assert_eq!(loaded_task(&conn).due_date.as_deref(), Some("2024-02-29"));
        }
    }

    #[test]
    fn due_date_persists_through_insert_load_update_and_clear() {
        let conn = database();
        initialize_schema(&conn).unwrap();
        insert_task_with_conn(&conn, input()).unwrap();
        let mut task = loaded_task(&conn);
        assert_eq!(task.due_date.as_deref(), Some("2024-02-29"));
        task.due_date = Some("2024-03-01".into());
        update_task_with_conn(&conn, task).unwrap();
        let mut task = loaded_task(&conn);
        assert_eq!(task.due_date.as_deref(), Some("2024-03-01"));
        task.due_date = None;
        update_task_with_conn(&conn, task).unwrap();
        assert_eq!(loaded_task(&conn).due_date, None);
    }

    #[test]
    fn due_date_json_is_optional_and_camel_case() {
        let mut value = serde_json::to_value(input()).unwrap();
        assert_eq!(value["dueDate"], "2024-02-29");
        assert!(value.get("due_date").is_none());
        value.as_object_mut().unwrap().remove("dueDate");
        let old_input: TaskInput = serde_json::from_value(value).unwrap();
        assert_eq!(old_input.due_date, None);
        let conn = database();
        insert_task_with_conn(&conn, old_input).unwrap();
        let task = loaded_task(&conn);
        assert_eq!(task.due_date, None);
        let mut value = serde_json::to_value(task).unwrap();
        assert!(value["dueDate"].is_null());
        value.as_object_mut().unwrap().remove("dueDate");
        assert_eq!(
            serde_json::from_value::<Task>(value).unwrap().due_date,
            None
        );
    }

    #[test]
    fn due_date_requires_bill_or_recurring_expense() {
        for task_type in ["normal", "income", "expense", "unknown"] {
            for bill in [false, true] {
                for recurring in [false, true] {
                    let valid = task_type == "expense" && (bill || recurring);
                    assert_eq!(
                        validate_due_date(task_type, bill, recurring, None, Some("2024-02-29"))
                            .is_ok(),
                        valid
                    );
                    assert!(validate_due_date(task_type, bill, recurring, None, None).is_ok());
                }
            }
        }
    }

    #[test]
    fn due_date_validates_calendar_format_and_inclusive_order() {
        for invalid in [
            "",
            "2024-2-29",
            "2024-02-9",
            "2023-02-29",
            "1900-02-29",
            "2024-04-31",
            "2024-00-01",
            "2024-13-01",
            "2024-01-00",
            "2024-02-29T00:00:00Z",
            " 2024-02-29",
            "2024-02-29 ",
            "+2024-02-29",
            "２０２４-02-29",
        ] {
            assert!(
                validate_due_date("expense", true, false, None, Some(invalid)).is_err(),
                "{invalid}"
            );
            assert!(
                validate_due_date("expense", true, false, Some(invalid), Some("2024-03-01"))
                    .is_err(),
                "{invalid}"
            );
        }
        for valid in ["2024-02-29", "2000-02-29", "2024-12-31"] {
            assert!(validate_due_date("expense", true, false, Some(valid), Some(valid)).is_ok());
        }
        assert!(validate_due_date(
            "expense",
            false,
            true,
            Some("2024-02-29"),
            Some("2024-03-01")
        )
        .is_ok());
        assert!(validate_due_date(
            "expense",
            true,
            false,
            Some("2024-03-01"),
            Some("2024-02-29")
        )
        .is_err());
        // Existing tasks without a due date retain their previous validation behavior.
        assert!(validate_due_date("normal", false, false, Some("legacy date"), None).is_ok());
    }

    #[test]
    fn due_date_invalid_writes_leave_database_unchanged() {
        let conn = database();
        for (task_type, bill, recurring, due) in [
            ("income", true, true, "2024-02-29"),
            ("expense", false, false, "2024-02-29"),
            ("expense", true, false, "2024-02-30"),
            ("expense", true, false, "2024-01-31"),
        ] {
            let mut task = input();
            task.r#type = task_type.into();
            task.bill = bill;
            task.recurring = recurring;
            task.due_date = Some(due.into());
            assert!(insert_task_with_conn(&conn, task).is_err());
        }
        assert!(load_tasks_with_conn(&conn, None, None).unwrap().is_empty());
        insert_task_with_conn(&conn, input()).unwrap();
        for (task_type, bill, recurring, due) in [
            ("normal", true, Some(true), "2024-02-29"),
            ("expense", false, None, "2024-02-29"),
            ("expense", true, Some(false), "not-a-date"),
            ("expense", true, Some(false), "2024-01-31"),
        ] {
            let mut task = loaded_task(&conn);
            task.r#type = task_type.into();
            task.bill = bill;
            task.recurring = recurring;
            task.due_date = Some(due.into());
            assert!(update_task_with_conn(&conn, task).is_err());
            let unchanged = loaded_task(&conn);
            assert_eq!(unchanged.r#type, "expense");
            assert!(unchanged.bill);
            assert_eq!(unchanged.due_date.as_deref(), Some("2024-02-29"));
        }
    }
}

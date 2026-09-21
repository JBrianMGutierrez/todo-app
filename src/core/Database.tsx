import { invoke } from '@tauri-apps/api/core';
import { DashboardStats, MonthGroup } from '../utils/Map';


type Task = {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  amount: number | null;
  type: "income" | "expense" | "normal";
  bill: boolean,
  scheduledDate?: string;
  recurring?: boolean;
  recurringDays?: number;
};

export async function insertTask(task: Task) {
  await invoke("insert_task", { task });
}

export type TaskFilter =
  | "all"
  | "today"
  | "pending"
  | "completed"
  | "income"
  | "expense"
  | "normal";

export async function loadTasks(
  filter: TaskFilter = "all",
  today: string = new Date().toISOString().split("T")[0],
) {
  const result = await invoke<any[]>("load_tasks", { filter, today });
  return result.map((t) => ({
    id: t.id,
    title: t.title,
    completed: t.completed,
    completedAt: t.completedAt ?? undefined,
    amount: t.amount ?? null,
    type: t.type,
    bill: t.bill,
    scheduledDate: t.scheduledDate ?? undefined,
    recurring: t.recurring,
    recurringDays: t.recurringDays ?? undefined,
  }));
}

export async function completeTask(id:string, isCompleted: boolean, today:string) {
  await invoke("complete_task", {
    id,
    isCompleted,
    today
  });
}

export async function deleteTask(id: string) {
  await invoke("delete_task", { id });
}

export async function updateTask(task: Task) {
  await invoke("update_task", { task });
}

export async function getDashboardStats() {
    return await invoke<DashboardStats>("get_dashboard_stats");
}

export async function getGroupTransactions() {
  return await invoke<MonthGroup[]>("get_grouped_transactions")
}
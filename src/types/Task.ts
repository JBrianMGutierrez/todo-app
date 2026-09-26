export type TaskType =
  | "income"
  | "expense"
  | "normal";

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  amount: number | null;
  type: TaskType;
  bill: boolean;
  scheduledDate?: string;
  recurring?: boolean;
  recurringDays?: number;
  dueDate?: string;
};
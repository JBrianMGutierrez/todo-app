export type DashboardStats = {
  dueToday: number;
  overdue: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  upcomingExpense: number;
};

export type TransactionItem = {
  title: string;
  amount: number;
};

export type TypeGroup = {
  group_type: "income" | "expense";
  items: TransactionItem[];
};

export type MonthGroup = {
  month: string;
  groups: TypeGroup[];
};
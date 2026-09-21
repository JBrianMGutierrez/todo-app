import { useEffect, useState } from "react";
import { Task } from "../../types/Task";
import { loadTasks } from "../../core/Database";
import { currencyFormatter } from "../../utils/Formatter";

type SidebarRightMobile = {
  setShowRightSidebar: (value: boolean) => void;
  balance: number;
  refreshKey: number;
};

export default function SidebarRight({
  setShowRightSidebar,
  balance,
  refreshKey
}: Readonly<SidebarRightMobile>) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTasks([]);
    setLoading(true);
    setError(null);

    loadTasks("completed")
      .then((updated) => {
        if (!cancelled) setTasks(updated);
      })
      .catch((error: unknown) => {
        if (!cancelled) setError(String(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* BACKDROP */}
      <div
        tabIndex={0} role="button"
        className="absolute inset-0 bg-black/50"
        onClick={() => setShowRightSidebar(false)}
      />

      {/* DRAWER */}
      <aside
        className="
          absolute
          right-0
          top-0
          h-full
          w-80
          bg-zinc-900
          p-6
          shadow-2xl
          overflow-y-auto
        "
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            Balance
          </h2>

          <button onClick={() => setShowRightSidebar(false)}>
            ✕
          </button>
        </div>

        {/* BALANCE CONTENT */}
        <div className="text-3xl font-bold mb-6">
          {currencyFormatter.format(balance)}
        </div>

        {loading && <p role="status">Loading transactions…</p>}
        {error && <p role="alert" className="text-red-400">Failed to load transactions: {error}</p>}

        {/* EXPENSE LIST */}
        <div className="space-y-3">
          {tasks
            .filter(
              (t) =>
                t.completed &&
                t.amount !== null &&
                t.amount > 0 &&
                (t.type === "income" || t.type === "expense")
            )
            .slice()
            .reverse()
            .slice(0, 10)
            .map((task) => (
              <div
                key={task.id}
                className="flex justify-between text-sm"
              >
                <span>{task.title}</span>

                <span
                  className={
                    task.type === "income"
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {task.type === "income" ? "+" : "-"}
                  {currencyFormatter.format(Number(task.amount ?? 0))}
                </span>
              </div>
            ))}
        </div>
      </aside>
    </div>
  )
}
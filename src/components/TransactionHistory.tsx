import { useEffect, useState } from "react";
import { getGroupTransactions } from "../core/Database";
import { currencyFormatter } from "../utils/Formatter";
import type { MonthGroup } from "../utils/Map";

export default function TransactionHistory({ refreshKey }: Readonly<{ refreshKey: number }>) {
  const [monthCount, setMonthCount] = useState(2);
  const [transactions, setTransactions] = useState<MonthGroup[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getGroupTransactions(monthCount)
      .then((data) => {
        if (cancelled) return;
        setTransactions(data.months);
        setHasMore(data.hasMore);
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
  }, [monthCount, refreshKey, retryKey]);

  return (
    <section aria-label="Transaction history" aria-busy={loading}>
      <h2 className="text-lg font-semibold mb-4">Transactions</h2>
      <div className="space-y-6">
        {transactions.map((month) => (
          <div key={month.month}>
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">{month.month}</h3>
            <div className="space-y-4">
              {month.groups.map((group) => (
                <div key={group.group_type}>
                  <h4 className={`text-xs font-bold uppercase mb-2 ${group.group_type === "income" ? "text-green-400" : "text-red-400"}`}>
                    {group.group_type}
                  </h4>
                  <div className="space-y-2">
                    {group.items.map((task, index) => (
                      <div key={`${task.title}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                        <div className="truncate flex-1 min-w-0">{task.title}</div>
                        <div className={`shrink-0 font-medium ${group.group_type === "income" ? "text-green-400" : "text-red-400"}`}>
                          {currencyFormatter.format(task.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {loading && <p role="status" className="mt-4">Loading transactions…</p>}
      {error && (
        <div role="alert" className="mt-4 text-red-400">
          <p>Failed to load transactions: {error}</p>
          <button type="button" className="mt-2 underline" onClick={() => setRetryKey((key) => key + 1)}>
            Try again
          </button>
        </div>
      )}
      {!loading && !error && transactions.length === 0 && (
        <p>No completed income or expenses in this period.</p>
      )}
      {hasMore && !error && (
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setMonthCount((count) => count + 5);
          }}
          className="mt-5 w-full rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Loading…" : "See more (previous 5 months)"}
        </button>
      )}
    </section>
  );
}

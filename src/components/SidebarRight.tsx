import { useEffect, useState, useRef } from "react";
import DashboardCard from "../components/MenuCards";
import { DashboardStats, MonthGroup } from "../utils/Map";
import { currencyFormatter } from "../utils/Formatter";
import { getGroupTransactions } from "../core/Database";
import { useScrollFade } from "../utils/ScrollFade/UseScrollFade";
import ScrollFade from "../utils/ScrollFade/ScrollFade";

type SidebarRightProps = {
  dashboardStats: DashboardStats | null;
  refreshKey: number;
};


export default function SidebarRight({
  dashboardStats,
  refreshKey
}: Readonly<SidebarRightProps>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [transactions, setTransactions] = useState<MonthGroup[]>([]);

  const {
    isScrollable,
    atTop,
    atBottom,
  } = useScrollFade(scrollRef);

  async function loadGroupTransactions() {
    const data = await getGroupTransactions();
    setTransactions(data);
  }
  useEffect(() => {
    loadGroupTransactions()
  }, [refreshKey]);
  return (
    <aside className="hidden lg:block w-80 shrink-0 pl-4 space-y-4">
        {/* BALANCE */}
        <DashboardCard
        title="Monthly Income (THIS MONTH)"
        value={dashboardStats
                ? currencyFormatter.format(dashboardStats?.monthlyIncome ?? 0)
                : "Loading..."}
        className="border-green-500/40"
        />
        <DashboardCard
        title="Monthly Expenses (THIS MONTH)"
        value={currencyFormatter.format(dashboardStats?.monthlyExpenses ?? 0)}
        className="border-red-500/40"
        />
        {/* TRANSACTION HISTORY */}
        <div className="relative bg-zinc-900 rounded-xl overflow-hidden">
          <ScrollFade
            position="top"
            show={isScrollable && !atTop}
          />
          <div className="bg-zinc-900 rounded-xl p-5 h-[61vh] overflow-y-auto hide-scrollbar"
            ref={scrollRef}>
            
            <h2 className="text-lg font-semibold mb-4">
                Transactions
            </h2>
            <div className="space-y-6">
                {transactions.map((month) => (
                <div key={month.month}>
                    <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                    {month.month}
                    </h3>

                    <div className="space-y-4">
                    {month.groups.map((group) => (
                        <div key={group.group_type}>
                        
                        {/* GROUP HEADER (Income / Expense) */}
                        <h4
                            className={`
                            text-xs
                            font-bold
                            uppercase
                            mb-2
                            ${
                                group.group_type === "income"
                                ? "text-green-400"
                                : "text-red-400"
                            }
                            `}
                        >
                            {group.group_type}
                        </h4>

                        {/* ITEMS */}
                        <div className="space-y-2">
                            {group.items.map((task, index) => (
                            <div
                                key={`${task.title}-${index}`}
                                className="
                                flex
                                items-center
                                justify-between
                                gap-3
                                text-sm
                                "
                            >
                                <div className="truncate flex-1 min-w-0">
                                {task.title}
                                </div>

                                <div
                                className={`
                                    shrink-0
                                    font-medium
                                    ${
                                    group.group_type === "income"
                                        ? "text-green-400"
                                        : "text-red-400"
                                    }
                                `}
                                >
                                {currencyFormatter.format(task.amount ?? 0)}
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
          </div>
          <ScrollFade
            position="bottom"
            show={isScrollable && !atBottom}
          />
        </div>
    </aside>
  )
}
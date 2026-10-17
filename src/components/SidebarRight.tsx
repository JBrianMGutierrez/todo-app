import { useRef } from "react";
import DashboardCard from "../components/MenuCards";
import { DashboardStats } from "../utils/Map";
import { currencyFormatter } from "../utils/Formatter";
import { useScrollFade } from "../utils/ScrollFade/UseScrollFade";
import ScrollFade from "../utils/ScrollFade/ScrollFade";
import TransactionHistory from "./TransactionHistory";

type SidebarRightProps = {
  dashboardStats: DashboardStats | null;
  refreshKey: number;
};

export default function SidebarRight({
  dashboardStats,
  refreshKey,
}: Readonly<SidebarRightProps>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isScrollable, atTop, atBottom } = useScrollFade(scrollRef);

  return (
    <aside className="hidden lg:block w-80 shrink-0 pl-4 space-y-4">
      <DashboardCard
        title="Monthly Income (THIS MONTH)"
        value={dashboardStats
          ? currencyFormatter.format(dashboardStats.monthlyIncome ?? 0)
          : "Loading..."}
        className="border-green-500/40"
      />
      <DashboardCard
        title="Monthly Expenses (THIS MONTH)"
        value={currencyFormatter.format(dashboardStats?.monthlyExpenses ?? 0)}
        className="border-red-500/40"
      />
      <div className="relative bg-zinc-900 rounded-xl overflow-hidden">
        <ScrollFade position="top" show={isScrollable && !atTop} />
        <div
          className="bg-zinc-900 rounded-xl p-5 h-[61vh] overflow-y-auto hide-scrollbar"
          ref={scrollRef}
        >
          <TransactionHistory refreshKey={refreshKey} />
        </div>
        <ScrollFade position="bottom" show={isScrollable && !atBottom} />
      </div>
    </aside>
  );
}

import { useState } from "react";
import { currencyFormatter } from "../utils/Formatter";
import { DashboardStats } from "../utils/Map";
import DashboardCard from "./MenuCards";
import { RefreshCcw } from "lucide-react";

type SidebarLeftProps = {
  greetMsg: string
  dashboardStats: DashboardStats | null;
  balance: number
  setShowAddModal: (value: boolean) => void;
  refreshAppData: () => Promise<void>;
};


export default function SidebarLeft({
  greetMsg,
  balance,
  dashboardStats,
  setShowAddModal,
  refreshAppData,
}: Readonly<SidebarLeftProps>) {
    const [loading, setLoading] = useState(false);
    return (
      <aside className="hidden lg:block w-80 shrink-0 h-[80vh] overflow-y-auto pl-4 pr-4 space-y-4">
        <section className="flex-1 min-w-0">
          <div className="mb-6 ite">
            <h2 className="text-lg font-semibold text-zinc-300 mb-4">
              {greetMsg}
            </h2>

            <div className="grid grid-flow-col justify-items-stretch gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="cursor-pointer bg-blue-500 text-white px-4 py-2 
                rounded-lg hover:bg-blue-600">
                + Add Task
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 mt-6">
              <DashboardCard title="Overall balance" 
                value={currencyFormatter.format(balance)}
                className="border-blue-500/40"/>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 mt-6">
              <DashboardCard title="Upcoming expense this month" 
                value={currencyFormatter.format(dashboardStats?.upcomingExpense ?? 0)}
                className="border-orange-500/40"/>
            </div>
          </div>
        </section>
        <button
          onClick={async () => {
            setLoading(true);
            await refreshAppData();
            setLoading(false);
          }}
          title="Refresh data"
          className="
            fixed
            bottom-6
            right-6
            z-50
            bg-zinc-700
            hover:bg-zinc-600
            text-white
            p-3
            rounded-full
            shadow-lg
            flex
            items-center
            justify-center
            transition">
          <RefreshCcw className={loading ? "animate-spin" : ""} size={24} />
        </button>
      </aside>
    )
}
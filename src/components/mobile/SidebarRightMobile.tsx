import { currencyFormatter } from "../../utils/Formatter";
import TransactionHistory from "../TransactionHistory";

type SidebarRightMobile = {
  setShowRightSidebar: (value: boolean) => void;
  balance: number;
  refreshKey: number;
};

export default function SidebarRight({
  setShowRightSidebar,
  balance,
  refreshKey,
}: Readonly<SidebarRightMobile>) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        tabIndex={0}
        role="button"
        className="absolute inset-0 bg-black/50"
        onClick={() => setShowRightSidebar(false)}
      />
      <aside className="absolute right-0 top-0 h-full w-80 bg-zinc-900 p-6 shadow-2xl overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Balance</h2>
          <button onClick={() => setShowRightSidebar(false)}>✕</button>
        </div>
        <div className="text-3xl font-bold mb-6">
          {currencyFormatter.format(balance)}
        </div>
        <TransactionHistory refreshKey={refreshKey} />
      </aside>
    </div>
  );
}

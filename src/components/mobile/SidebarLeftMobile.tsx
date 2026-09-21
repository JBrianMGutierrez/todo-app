type SidebarLeftProps = {
  greetMsg: string;
  onClose: () => void;
  setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  refreshAppData: () => Promise<void>;
};

export default function SidebarLeftMobile({
  greetMsg,
  onClose,
  setShowAddModal,
  refreshAppData,
}: Readonly<SidebarLeftProps>) {
  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 h-full w-80 bg-zinc-950 p-4 shadow-2xl z-50">
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="mb-4 text-zinc-400"
        >
          ✕
        </button>

        <h1 className="text-4xl font-bold mb-4">{greetMsg}</h1>

        <div className="grid gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            + Add Task
          </button>
          <button
            onClick={async () => {
              await refreshAppData();
            }}
            className="bg-zinc-700 text-white px-4 py-2 rounded-lg"
          >
            Refresh
          </button>
        </div>
      </div>
    </>
  );
}

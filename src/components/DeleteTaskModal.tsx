type DeleteTaskModalProps = {
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export default function DeleteTaskModal({
  onClose,
  onConfirm,
}: Readonly<DeleteTaskModalProps>) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl shadow-md w-80">
        <h2 className="text-lg font-semibold mb-4">Delete this task?</h2>

        <p className="text-sm text-zinc-400 mb-6">
          This action cannot be undone.
        </p>

        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1 text-zinc-300"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="px-3 py-1 bg-red-500 text-white rounded"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

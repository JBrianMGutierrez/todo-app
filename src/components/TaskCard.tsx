import { currencyFormatter } from '../utils/Formatter';
import type { Task } from "../types/Task";
import { Check, Pencil, Trash2, AlertTriangle, Repeat,
        TrendingUp, TrendingDown } from "lucide-react";

type TaskCardProps = {
  task: Task;
  toggleTask: (id: string) => void;
  setDeleteTargetId: (id: string) => void;
  openEditModal: (task: Task) => void;
  animating?: boolean;
};

export default function TaskCard({ task, toggleTask, setDeleteTargetId, openEditModal, animating = false }: Readonly<TaskCardProps>) {
  const needsAmount = task.bill && (!task.amount || task.amount <= 0);
  return (
    <div
      className={`
        task-card
        border
        p-4
        flex
        items-center
        justify-between
        bg-zinc-900
        transition-all
        duration-700
        ${
          needsAmount
            ? "border-yellow-500 shadow-yellow-500/20 shadow-md"
            : "border-zinc-800"
        }
        ${
          animating
            ? "opacity-0 translate-x-6 scale-95"
            : "opacity-100"
        }
      `}>
      <div className="space-y-2 min-w-0 flex-1">
        <div
          className={`
            relative
            transition-opacity
            duration-500
            ${
              task.completed || animating
                ? "opacity-60"
                : ""
            }
          `}>
          <div className="relative inline-block">
            <div className="font-medium text-base wrap-break-words">
              {task.title}
            </div>
            <div
              className={`
                absolute
                left-0
                top-1/2
                h-0.5
                bg-white
                transition-all
                duration-500
                ${
                  task.completed || animating
                    ? "w-full"
                    : "w-0"
                }
              `}
            />
          </div>

          <div className="flex gap-2 flex-wrap text-sm text-gray-400">
            <span className="flex items-center gap-1">
              {task.type.toLocaleLowerCase() === "income" ? (
                <TrendingUp size={14} className="text-green-400" />
              ) : (
                <TrendingDown size={14} className="text-red-400" />
              )}
            </span>

            {needsAmount && (
              <span className="flex items-center gap-1 text-yellow-400 text-xs">
                <AlertTriangle size={14} />
                Amount Required
              </span>
            )}

            {task.amount !== null && (
              <span>
                {currencyFormatter.format(Number(task.amount ?? 0))}
              </span>
            )}

            {task.scheduledDate && (
              <span>
                {task.scheduledDate}
              </span>
            )}

            {task.recurring && (
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Repeat size={14} className="text-zinc-400" />
                <span>{task.recurringDays} days</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-2 opacity-100">
        <button
          aria-label={`Complete ${task.title}`}
          title="Complete task"
          disabled={task.completed || needsAmount}
          onClick={() => toggleTask(task.id)}
          className={`
            p-2 rounded transition
            ${
              task.completed || needsAmount
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed "
                : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
            }
          `}>
          <Check size={18} />
        </button>
        <button
          aria-label={`Edit ${task.title}`}
          title="Edit task"
          onClick={() => openEditModal(task)}
          className="
            p-2 rounded
            bg-yellow-500/10 text-yellow-400
            hover:bg-yellow-500/20
            transition
          "
        >
          <Pencil size={18} />
        </button>

        <button
          aria-label={`Delete ${task.title}`}
          title="Delete task"
          onClick={() => setDeleteTargetId(task.id)}
          className="
            p-2 rounded
            bg-red-500/10 text-red-400
            hover:bg-red-500/20
            transition">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

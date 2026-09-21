import { Check } from "lucide-react";
import type { Task, TaskType } from "../types/Task";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useState } from "react";
import { NumericFormat } from "react-number-format";

type TaskModalProps = {
  show: boolean;
  onClose: () => void;

  editingTask: Task | null;

  form: TaskFormState;
  setForm: React.Dispatch<React.SetStateAction<TaskFormState>>;

  formAction: () => void;
};

type TaskFormState = {
  task: string;
  type: TaskType;
  amount: string;
  bill: boolean;
  scheduledDate: string;
  recurring: boolean;
  recurringDays: string;
};

export default function TaskForm({
  onClose,
  editingTask,
  form,
  setForm,
  formAction,
}: Readonly<TaskModalProps>) {
	const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
      {/* BACKDROP */}
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div tabIndex={0} role="button" className="relative bg-zinc-900 p-6 rounded-2xl w-full max-w-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4">
          {editingTask ? "Edit Task" : "Add Task"}
        </h2>
        <div className="gap-2 mb-8">
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              formAction();
            }}>
            {/* TASK TITLE */}
            <div className="space-y-1 mb-4">
              <label className="text-sm text-zinc-400" htmlFor="task">
                Task description
              </label>
              <input
                id="task"
                className="w-full border border-zinc-700 bg-zinc-900 p-3 rounded"
                value={form.task}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    task: e.target.value,
                  }))
                }
                placeholder="Enter description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* TASK TYPE */}
              <div className="space-y-1">
                <label
                  htmlFor="type"
                  className="text-sm text-zinc-400">
                  Type
                </label>

                <div className="relative">
                  <select className="w-full border border-zinc-700 bg-zinc-900 p-2 rounded appearance-none pr-8"
                    value={form.type}
                    onChange={(e) =>
                      setForm(prev => ({
                        ...prev,
                        type: e.target.value as TaskType,
                      }))
                    }>
                    <option value="normal">Normal</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>

                  <div className="absolute right-2 top-2 text-gray-400 pointer-events-none">
                    ▼
                  </div>
                </div>
              </div>
              {/* TASK DATE */}
              <div className="space-y-1">
                <label
                  htmlFor="date"
                  className="text-sm text-zinc-400">
                  Date
                </label>

                <div className="w-full">
                  <Popover.Root
                    open={calendarOpen}
                    onOpenChange={setCalendarOpen}>
                    <Popover.Trigger asChild>
                      <button
                        type="button"
                        className="
                          w-full
                          border
                          border-zinc-700
                          bg-zinc-900
                          p-2
                          rounded
                          text-left
                        "
                      >
                        {form.scheduledDate || "Select Date"}
                      </button>
                    </Popover.Trigger>

                    <Popover.Portal>
                      <Popover.Content
                        sideOffset={8}
                        className="
                          w-auto
                          z-50
                          rounded-xl
                          border
                          border-zinc-700
                          bg-zinc-900
                          p-3
                          shadow-2xl
                        "
                      >
                        <DayPicker
                          mode="single"
                          classNames={{
                            day: "h-8 w-8 text-xs",
                            weekday: "text-xs",
                            caption_label: "text-sm",
                          }}
                          selected={
                            form.scheduledDate
                              ? new Date(form.scheduledDate)
                              : undefined
                          }
                          onSelect={(date) => {
                            if (!date) return;

                            const formattedDate =
                              `${date.getFullYear()}-${
                                String(date.getMonth() + 1).padStart(2, "0")
                              }-${
                                String(date.getDate()).padStart(2, "0")
                              }`;

                            setForm({
                              ...form,
                              scheduledDate: formattedDate,
                            });
														setCalendarOpen(false);
                          }}
                        />
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>
              </div>
            </div>
            {/* TASK AMOUNT */}
            <div className="space-y-1 mb-4">
              <label className="text-sm text-zinc-400" htmlFor="task">
                Amount
							</label>
							<NumericFormat
								className="w-full border border-zinc-700 bg-zinc-900 p-3 rounded disabled:opacity-40 disabled:cursor-not-allowed align-middle"
							  value={form.amount}
							  thousandSeparator=","
							  decimalSeparator="."
							  decimalScale={2}
							  fixedDecimalScale
							  allowNegative={false}
							  placeholder="0.00"
							  onValueChange={(values) => {
							    setForm((prev) => ({
							      ...prev,
							      amount: values.value, // "26000000.50"
							    }));
							  }}
							/>
            </div>
            {/* TASK ATTRIBUTES */}
            <fieldset
              className="
                border
                border-zinc-700
                rounded-xl
                p-4
                mb-4">
              <legend
                className="
                  px-2
                  text-xs
                  uppercase
                  tracking-widest
                  text-zinc-500">
                Attributes
              </legend>

              <div className="grid grid-cols-2 gap-4">
                {/* Bill */}
                <label
                  className="
                    flex
                    items-center
                    gap-3
                    cursor-pointer
                  ">
                  <div
                    className={`
                      w-5 h-5 rounded border
                      flex items-center justify-center
                      ${
                        form.bill
                          ? "bg-blue-500 border-blue-500"
                          : "bg-zinc-800 border-zinc-600"
                      }
                    `}
                  >
                    {form.bill && <Check size={14} />}
                  </div>

                  <input
                    type="checkbox"
                    className="hidden"
                    checked={form.bill}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        bill: e.target.checked,
                      })
                    }/>

                  <span>Bill</span>
                </label>

                {/* Recurring */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition
                      ${
                        form.recurring
                          ? "bg-blue-500 border-blue-500"
                          : "bg-zinc-800 border-zinc-600"
                      }
                    `}
                  >
                    {form.recurring && <Check size={14} className="text-white" />}
                  </div>

                  <input
                    type="checkbox"
                    checked={form.recurring}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        recurring: e.target.checked,
                      }))
                    }
                    className="hidden"
                  />

                  <span className="text-sm">Recurring</span>
                </label>
              </div>
            </fieldset>
            <div className="space-y-1">
              <label className="text-sm text-zinc-400" htmlFor="task">
                Reccuring days
              </label>
              <input
                className="w-full border border-zinc-700 bg-zinc-900 p-2 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                type="number"
                placeholder="Every X days"
                value={form.recurringDays}
                disabled={!form.recurring}
                required={!form.recurring}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    recurringDays: e.target.value,
                  }))
                }
              />
            </div>
          </form>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="border px-4 py-2 rounded">
            Cancel
          </button>

          <button
            onClick={formAction}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            {editingTask ? "Save Changes" : "Add Task"}
          </button>
        </div>

      </div>
    </div>
  )
}

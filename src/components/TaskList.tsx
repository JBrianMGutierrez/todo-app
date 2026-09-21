import { useRef, useState } from "react";
import type { Task } from "../types/Task";
import type { TaskFilter } from "../core/Database";
import TaskCard from "./TaskCard";
import EmptyStateCard from "./EmptyCard";

import { useScrollFade } from "../utils/ScrollFade/UseScrollFade";
import ScrollFade from "../utils/ScrollFade/ScrollFade";


type TaskListProps = {
  tasks: Task[];
  filter: TaskFilter;
  setFilter: (filter: TaskFilter) => void;
  loading: boolean;
  error: string | null;

  dueTodayCount: number;
  overdueCount: number;

  animatingTasks: string[];

  toggleTask: (id: string) => void;
  setDeleteTargetId: (id: string) => void;
  openEditModal: (task: Task) => void;
};
export default function TaskList({
    tasks,
    filter,
    setFilter,
    loading,
    error,

    dueTodayCount,
    overdueCount,

    animatingTasks,

    toggleTask,
    setDeleteTargetId,
    openEditModal,
}: Readonly<TaskListProps>) {
  const today = new Date().toISOString().split("T")[0];
  const filterItems: TaskFilter[] = ["all", "today", "pending", "completed", "income", "expense", "normal"];

  const [showToday, setShowToday] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showOverdue, setShowOverdue] = useState(true);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const {
    isScrollable,
    atTop,
    atBottom,
  } = useScrollFade(scrollRef);

  const filteredTasks = [...tasks].sort((a, b) => {
      if (filter !== "all") {
        return (
          new Date(a.scheduledDate || "").getTime() -
          new Date(b.scheduledDate || "").getTime()
        );
      }

      const aDate = a.scheduledDate || "";
      const bDate = b.scheduledDate || "";

      const aIsToday = aDate === today;
      const bIsToday = bDate === today;

      // TODAY TASKS FIRST
      if (aIsToday !== bIsToday) {
        return aIsToday ? -1 : 1;
      }

      // ACTIVE BEFORE COMPLETED
      if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed);
      }

      // DATE SORT
      return (
        new Date(aDate).getTime() -
        new Date(bDate).getTime()
      );
  })

  const todayTasks = filteredTasks.filter(
    (t) => t.scheduledDate === today && !t.completed
  );

  const upcomingTasks = filteredTasks.filter(
    (t) =>
      t.scheduledDate &&
      t.scheduledDate > today &&
      !t.completed
  );

  const completedTasks = filteredTasks.filter(
    (t) => t.completed
  );

  const overdueTasks = filteredTasks.filter(
    (t) =>
      t.scheduledDate &&
      t.scheduledDate < today &&
      !t.completed
  );
  return (
    <section className="flex-1 max-w-4xl mx-auto min-w-0">
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {filterItems.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`
                w-full
                px-4
                py-2
                rounded-lg
                text-sm
                transition
                ${
                  filter === item
                    ? "bg-blue-500 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }
              `}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        {loading && <p role="status">Loading tasks…</p>}
        {error && <p role="alert" className="text-red-400">Failed to load tasks: {error}</p>}
        <div className={`relative flex-1 min-w-0 flex flex-col ${loading || error ? "hidden" : ""}`}>
          <div/> {/* DONT DELETE */}
          <ScrollFade
            position="top"
            show={isScrollable && !atTop}
          />
          <div className="flex-1 overflow-y-auto hide-scrollbar max-h-[70vh] pr-2 space-y-6"
              ref={scrollRef}>
            {overdueTasks.length > 0 && (
              <section>
                  <button
                    onClick={() => setShowOverdue(!showOverdue)}
                    className="w-full flex justify-between items-center mb-3 p-3 border border-red-500">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-red-400">
                        Overdue
                      </h2>

                      <span
                        className="px-2 py-0.5 rounded-full bg-red-500/20 text-blue-400 text-sm
                          font-medium
                        ">
                        {overdueCount}
                      </span>
                    </div>
                    <span
                      className={`
                        transition-transform
                        duration-500
                        ${
                          showOverdue
                            ? "rotate-0"
                            : "-rotate-90"
                        }
                      `}>
                      ▼
                    </span>
                  </button>
                  <div
                    className={`
                      accordion-grid
                      ${
                        showOverdue
                          ? "accordion-open"
                          : "accordion-closed"
                      }
                    `}>
                    <div className="accordion-inner">
                      <div className="space-y-2 pt-1">
                        {overdueTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              toggleTask={toggleTask}
                              setDeleteTargetId={setDeleteTargetId}
                              openEditModal={openEditModal}
                              animating={animatingTasks.includes(task.id)}
                            />
                          ))}
                      </div>
                    </div>
                  </div>
                </section>
            )}
            <section>
              <button
                onClick={() => setShowToday(!showToday)}
                className="w-full flex justify-between items-center mb-3 p-3 border border-zinc-500">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">
                    Today
                  </h2>
                  <span
                    className="
                      px-2
                      py-0.5
                      rounded-full
                      bg-blue-500/20
                      text-blue-400
                      text-sm
                      font-medium
                    ">
                    {dueTodayCount}
                  </span>
                </div>
                <span
                  className={`
                    transition-transform
                    duration-500
                    ${
                      showToday
                        ? "rotate-0"
                        : "-rotate-90"
                    }
                  `}>
                  ▼
                </span>
              </button>
              <div
                className={`
                  accordion-grid
                  ${
                    showToday
                      ? "accordion-open"
                      : "accordion-closed"
                  }
                `}>
                <div className="accordion-inner">
                  <div className="space-y-2 pt-1">
                    {todayTasks.length > 0 ? (
                      todayTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          toggleTask={toggleTask}
                          setDeleteTargetId={setDeleteTargetId}
                          openEditModal={openEditModal}
                          animating={animatingTasks.includes(task.id)}
                        />
                      ))
                    ) : (
                      <EmptyStateCard
                        message="No tasks scheduled today"
                      />
                    )}
                  </div>
                </div>
              </div>
            </section>
            {upcomingTasks.length > 0 && (
              <section>
                <button
                  onClick={() => setShowUpcoming(!showUpcoming)}
                  className="w-full flex justify-between items-center mb-3 p-3 border border-zinc-500">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">
                      Upcoming
                    </h2>

                    <span
                      className="
                        px-2
                        py-0.5
                        rounded-full
                        bg-yellow-500/20
                        text-yellow-400
                        text-sm
                        font-medium
                      ">
                      {upcomingTasks.length}
                    </span>
                  </div>
                  <span
                    className={`
                      transition-transform
                      duration-500
                      ${
                        showUpcoming
                          ? "rotate-0"
                          : "-rotate-90"
                      }
                    `}>
                    ▼
                  </span>
                </button>
                <div
                  className={`
                    accordion-grid
                    ${
                      showUpcoming
                        ? "accordion-open"
                        : "accordion-closed"
                    }
                  `}>
                  <div className="accordion-inner">
                    <div className="space-y-2 pt-1">
                      {upcomingTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          toggleTask={toggleTask}
                          setDeleteTargetId={setDeleteTargetId}
                          openEditModal={openEditModal}
                          animating={animatingTasks.includes(task.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}
            {completedTasks.length > 0 && (
              <section className="pb-1">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="w-full flex justify-between items-center mb-3 p-3 border border-zinc-500"
                >
                  <h2 className="text-xl font-bold">
                    Completed
                  </h2>

                  <span
                    className={`
                      transition-transform
                      duration-500
                      ${
                        showCompleted
                          ? "rotate-0"
                          : "-rotate-90"
                      }
                    `}>
                    ▼
                  </span>
                </button>
                <div
                  className={`
                    accordion-grid
                    ${
                      showCompleted
                        ? "accordion-open"
                        : "accordion-closed"
                    }
                  `}>
                    <div className="accordion-inner">
                      <div className="space-y-2 pt-1">
                        {completedTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            toggleTask={toggleTask}
                            setDeleteTargetId={setDeleteTargetId}
                            openEditModal={openEditModal}
                            animating={animatingTasks.includes(task.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
              </section>
            )}
            <div
              className={`
                mt-6
                mb-2
                h-px
                w-full
                bg-linear-to-r
                from-transparent
                via-zinc-200
                to-transparent
                shadow-[0_0_15px_rgba(255,255,255,0.05)]
                ${isScrollable && atBottom ? "opacity-100" : "opacity-0"}
              `}
            />
          </div>
          <ScrollFade
            position="bottom"
            show={isScrollable && !atBottom}
          />
        </div>
      </div>
    </section>
  );
}

import { useState, useEffect } from "react";
import {
  insertTask,
  loadTasks,
  completeTask,
  deleteTask,
  updateTask,
} from "./core/Database";
import "@fontsource-variable/fira-code";
import "./App.css";
import ThemePicker from "./components/ThemePicker";

import { invoke } from "@tauri-apps/api/core";
import { playDing } from "./utils/Sounds";
import type { Task, TaskType } from "./types/Task";
import type { TaskFilter } from "./core/Database";

import { DashboardStats } from "./utils/Map";
import TaskList from "./components/TaskList";
import TaskForm from "./components/TaskForm";
import DeleteTaskModal from "./components/DeleteTaskModal";
import SidebarRight from "./components/SidebarRight";
import SidebarLeft from "./components/SidebarLeft";
import SidebarRightMobile from "./components/mobile/SidebarRightMobile";
import SidebarLeftMobile from "./components/mobile/SidebarLeftMobile";
import FloatingButton from "./components/mobile/floating/SideBarRightButton";
import AddTaskFloatingButton from "./components/mobile/floating/AddTaskButton";

function App() {
  const [animatingTasks, setAnimatingTasks] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    task: "",
    type: "normal" as TaskType,
    amount: "",
    bill: false,
    scheduledDate: today,
    recurring: false,
    recurringDays: "",
  });

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [greetMsg, setGreetMsg] = useState("");
  const [balance, setBalance] = useState(0);

  // from rust
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null,
  );

  async function loadBalance() {
    const result = await invoke<number>("get_balance");
    setBalance(result);
  }

  async function loadDashboardStats() {
    const stats = await invoke<DashboardStats>("get_dashboard_stats");
    setDashboardStats(stats);
  }

  async function finishTaskAnimation(id: string) {
    await refreshAppData();

    setAnimatingTasks((prev) => prev.filter((taskId) => taskId !== id));
  }

  useEffect(() => {
    async function init() {
      setGreetMsg(await invoke("greet", { name: "TODO App" }));
      await Promise.all([loadBalance(), loadDashboardStats()]);
    }
    init();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTasks([]);
    setTasksLoading(true);
    setTasksError(null);

    loadTasks(filter, today)
      .then((updated) => {
        if (!cancelled) setTasks(updated);
      })
      .catch((error: unknown) => {
        if (!cancelled) setTasksError(String(error));
      })
      .finally(() => {
        if (!cancelled) setTasksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filter, today, refreshKey]);

  function changeFilter(nextFilter: TaskFilter) {
    if (nextFilter === filter) return;
    setTasks([]);
    setTasksLoading(true);
    setTasksError(null);
    setFilter(nextFilter);
  }

  function addDays(dateStr: string, days: number) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }

  async function addTask() {
    if (form.task.trim() === "") return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: form.task,
      completed: false,
      completedAt: undefined,
      type: form.type,
      bill: form.bill,
      amount:
        form.type === "normal" || form.amount === ""
          ? null
          : Number(form.amount),
      scheduledDate: form.scheduledDate || today,
      recurring: form.recurring,
      recurringDays: form.recurring ? Number(form.recurringDays) : undefined,
    };

    await insertTask(newTask);
    await refreshAppData();

    resetForm();
  }

  async function toggleTask(id: string) {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const isNowCompleted = !target.completed;

    if (isNowCompleted) {
      playDing();

      setAnimatingTasks((prev) => [...prev, id]);
    }

    await completeTask(id, isNowCompleted, today);

    // Only generate recurrence when completing task
    if (
      target &&
      isNowCompleted &&
      target.recurring &&
      target.recurringDays &&
      target.scheduledDate
    ) {
      const nextTask = {
        ...target,
        id: crypto.randomUUID(),
        completed: false,
        completedAt: undefined,
        scheduledDate: addDays(target.scheduledDate, target.recurringDays),
        bill: target.bill ?? false,
        amount: target.bill ? null : target.amount,
      };

      await insertTask(nextTask);
    }

    setTimeout(finishTaskAnimation, 700, id);
  }

  async function refreshAppData() {
    await loadBalance();
    await loadDashboardStats();

    setRefreshKey((prev) => prev + 1);
  }

  async function formAction() {
    if (editingTask) {
      await updateTask({
        ...editingTask,
        title: form.task,
        amount: form.amount ? Number(form.amount) : null,
        type: form.type,
        bill: form.bill,
        scheduledDate: form.scheduledDate,
        recurring: form.recurring,
        recurringDays: form.recurringDays
          ? Number(form.recurringDays)
          : undefined,
      });
    } else {
      await addTask();
    }

    await refreshAppData();

    resetForm();

    setShowAddModal(false);
  }

  async function deleteTaskFn(id: string) {
    await deleteTask(id);
    await refreshAppData();
  }

  function openEditModal(taskData: Task) {
    setEditingTask(taskData);

    setForm({
      task: taskData.title,
      type: taskData.type,
      amount: taskData.amount === null ? "" : taskData.amount.toString(),
      bill: taskData.bill,
      scheduledDate: taskData.scheduledDate || "",
      recurring: taskData.recurring || false,
      recurringDays: taskData.recurringDays
        ? taskData.recurringDays.toString()
        : "",
    });

    setShowAddModal(true);
  }

  function resetForm() {
    setForm({
      task: "",
      type: "normal",
      amount: "",
      bill: false,
      scheduledDate: today,
      recurring: false,
      recurringDays: "",
    });
    setEditingTask(null);
  }

  const closeModal = () => {
    resetForm();
    setShowAddModal(false);
  };

  const dueTodayCount = dashboardStats?.dueToday ?? 0;

  const overdueCount = dashboardStats?.overdue ?? 0;

  return (
    <main className="app-shell min-h-screen text-white">
      <header className="app-header">
        <div>
          <p className="app-eyebrow">YOUR DAILY SPACE</p>
          <h1 className="app-title">A little more done<span>.</span></h1>
          <p className="app-subtitle">Tasks, plans, and a little peace of mind.</p>
        </div>
        <ThemePicker />
      </header>
      {/* MENU */}
      <div className="w-full max-w-7xl mx-auto flex gap-6 px-4 sm:px-6">
        <SidebarLeft
          greetMsg={greetMsg}
          balance={balance}
          dashboardStats={dashboardStats}
          setShowAddModal={setShowAddModal}
          refreshAppData={refreshAppData}
        />

        {/* FILTER & LIST */}
        <TaskList
          tasks={tasks}
          filter={filter}
          setFilter={changeFilter}
          loading={tasksLoading}
          error={tasksError}
          dueTodayCount={dueTodayCount}
          overdueCount={overdueCount}
          animatingTasks={animatingTasks}
          toggleTask={toggleTask}
          setDeleteTargetId={setDeleteTargetId}
          openEditModal={openEditModal}
        />

        {/* RIGHT SIDEBAR */}
        <SidebarRight dashboardStats={dashboardStats} refreshKey={refreshKey} />
      </div>
      {/* MODALS */}
      {showAddModal && (
        <TaskForm
          form={form}
          setForm={setForm}
          editingTask={editingTask}
          show={showAddModal}
          onClose={closeModal}
          formAction={formAction}
        />
      )}
      {deleteTargetId && (
        <DeleteTaskModal
          onClose={() => setDeleteTargetId(null)}
          onConfirm={async () => {
            await deleteTaskFn(deleteTargetId);
            setDeleteTargetId(null);
          }}
        />
      )}
      {/* SIDE BUTTONS */}
      <AddTaskFloatingButton onClick={() => setShowAddModal(true)} />
      <FloatingButton label="Balance" icon={<span>₱</span>} onClick={() => setShowRightSidebar(true)} />
      {showLeftSidebar && (
        <SidebarLeftMobile
          greetMsg={greetMsg}
          onClose={() => setShowLeftSidebar(false)}
          setShowAddModal={setShowAddModal}
          refreshAppData={refreshAppData}
        />
      )}
      {showRightSidebar && (
        <SidebarRightMobile
          setShowRightSidebar={setShowRightSidebar}
          refreshKey={refreshKey}
          balance={balance}
        />
      )}
    </main>
  );
}

export default App;

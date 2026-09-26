# Todo App

A desktop to-do app that brings everyday tasks and personal money tracking together. Organize what you need to do, track income and expenses, and keep bills alongside the rest of your plans.

## Why I built it

This app is inspired by **Microsoft To Do**. I used to use Microsoft To Do not only for everyday tasks, but also to keep track of money-related things. I built this app around that same workflow, adding dedicated money tracking capabilities so tasks, income, expenses, and bills can live in one place.

This is an independent project and is not affiliated with or endorsed by Microsoft.

## Features

- **Everyday tasks:** Create, edit, complete, and delete tasks.
- **Scheduling and recurring tasks:** Set scheduled dates and repeat tasks at a chosen interval in days.
- **Income and expense tracking:** Attach amounts to financial tasks instead of keeping them only as notes.
- **Bill tracking:** Mark expenses as bills and set optional due dates for bill or recurring expenses.
- **Financial overview:** See your tracked balance, monthly income and expenses, and upcoming expenses for the month.
- **Task filters:** View today's tasks, pending or completed items, or tasks by type.
- **Themes:** Customize the app's appearance with the built-in theme picker.
- **Local storage:** Store task data locally using SQLite.

## How money tracking works

Tasks can be normal to-dos, income, or expenses. Completing an income task adds its amount to the tracked balance; completing an expense task subtracts it. Normal tasks do not affect the balance.

For example, you can add your salary as an income task, an electricity bill as an expense, and a household chore as a normal task. Mark each one complete when it is received, paid, or done.

The balance reflects the completed financial tasks you record in the app—it is not a live bank balance.

## Built with

- **Tauri 2 and Rust** for the desktop application and backend
- **React and TypeScript** for the interface
- **SQLite** for local data storage
- **Vite and Tailwind CSS** for frontend tooling and styling

## Run locally

### Prerequisites

- Node.js and npm compatible with Vite 7 (Node.js 20.19+ or 22.12+)
- Rust and Cargo
- The platform-specific [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

From the project directory, install dependencies and start the desktop app:

```sh
npm install
npm run tauri dev
```

To build the desktop application:

```sh
npm run tauri build
```

Use the Tauri commands for the full app. Running `npm run dev` alone starts only the frontend development server; database operations require the Tauri backend.

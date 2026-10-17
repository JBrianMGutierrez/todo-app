import { useLayoutEffect, useState } from "react";

export const themes = [
  { id: "mocha", label: "Mocha" },
  { id: "macchiato", label: "Macchiato" },
  { id: "frappe", label: "Frappé" },
  { id: "latte", label: "Latte" },
] as const;

export const timeZones = [
  { id: "Asia/Manila", label: "Philippines" },
  { id: "Asia/Singapore", label: "Singapore" },
  { id: "Asia/Tokyo", label: "Japan" },
  { id: "Asia/Seoul", label: "South Korea" },
  { id: "Asia/Kolkata", label: "India" },
  { id: "Asia/Dubai", label: "Dubai" },
  { id: "Europe/London", label: "London" },
  { id: "Europe/Paris", label: "Paris" },
  { id: "America/New_York", label: "New York" },
  { id: "America/Chicago", label: "Chicago" },
  { id: "America/Los_Angeles", label: "Los Angeles" },
  { id: "Australia/Sydney", label: "Sydney" },
  { id: "Pacific/Auckland", label: "New Zealand" },
  { id: "UTC", label: "UTC" },
] as const;

export type Theme = (typeof themes)[number]["id"];
export type TimeZone = (typeof timeZones)[number]["id"];

export function isTheme(value: string | null): value is Theme {
  return themes.some((theme) => theme.id === value);
}

export function isTimeZone(value: string | null): value is TimeZone {
  return timeZones.some((zone) => zone.id === value);
}

function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function useSettings() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = readSetting("todo-theme");
    return isTheme(saved) ? saved : "mocha";
  });
  const [timeZone, setTimeZone] = useState<TimeZone>(() => {
    const saved = readSetting("todo-clock-timezone");
    return isTimeZone(saved) ? saved : "Asia/Manila";
  });

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("todo-theme", theme);
      localStorage.setItem("todo-clock-timezone", timeZone);
    } catch {
      // Settings still apply when persistent storage is unavailable.
    }
  }, [theme, timeZone]);

  return { theme, setTheme, timeZone, setTimeZone };
}

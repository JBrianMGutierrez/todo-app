import { useLayoutEffect, useState } from "react";
import { Palette } from "lucide-react";

const themes = [
  { id: "mocha", label: "Mocha" },
  { id: "macchiato", label: "Macchiato" },
  { id: "frappe", label: "Frappé" },
  { id: "latte", label: "Latte" },
] as const;
type Theme = (typeof themes)[number]["id"];

function isTheme(value: string | null): value is Theme {
  return themes.some((theme) => theme.id === value);
}

export default function ThemePicker() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("todo-theme");
      return isTheme(saved) ? saved : "mocha";
    } catch {
      return "mocha";
    }
  });

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("todo-theme", theme);
    } catch {
      // The theme still works when persistent storage is unavailable.
    }
  }, [theme]);

  return (
    <label className="theme-picker">
      <Palette size={16} aria-hidden="true" />
      <span className="sr-only">Catppuccin theme</span>
      <select value={theme} onChange={(event) => {
        if (isTheme(event.target.value)) setTheme(event.target.value);
      }}>
        {themes.map(({ id, label }) => (
          <option key={id} value={id}>{label}</option>
        ))}
      </select>
    </label>
  );
}

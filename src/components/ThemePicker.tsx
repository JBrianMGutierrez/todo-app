import { Palette } from "lucide-react";
import { isTheme, themes, type Theme } from "../core/useSettings";

type ThemePickerProps = {
  theme: Theme;
  onChange: (theme: Theme) => void;
};

export default function ThemePicker({ theme, onChange }: Readonly<ThemePickerProps>) {
  return (
    <label className="theme-picker">
      <Palette size={16} aria-hidden="true" />
      <span className="sr-only">Catppuccin theme</span>
      <select value={theme} onChange={(event) => {
        if (isTheme(event.target.value)) onChange(event.target.value);
      }}>
        {themes.map(({ id, label }) => (
          <option key={id} value={id}>{label}</option>
        ))}
      </select>
    </label>
  );
}

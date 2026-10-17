import { useRef } from "react";
import { Settings, X } from "lucide-react";
import { isTimeZone, timeZones, type Theme, type TimeZone } from "../core/useSettings";
import ThemePicker from "./ThemePicker";

type SettingsMenuProps = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  timeZone: TimeZone;
  onTimeZoneChange: (timeZone: TimeZone) => void;
};

export default function SettingsMenu({
  theme,
  onThemeChange,
  timeZone,
  onTimeZoneChange,
}: Readonly<SettingsMenuProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="settings-button"
        aria-label="Open settings"
        aria-haspopup="dialog"
        title="Settings"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Settings size={20} aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        className="settings-dialog"
        aria-labelledby="settings-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="settings-content">
          <header className="flex items-center justify-between gap-4 mb-6">
            <h2 id="settings-title" className="text-xl font-semibold">Settings</h2>
            <button
              type="button"
              className="settings-button"
              aria-label="Close settings"
              onClick={() => dialogRef.current?.close()}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div className="space-y-6">
            <section aria-labelledby="settings-appearance">
              <h3 id="settings-appearance" className="font-semibold mb-2">Appearance</h3>
              <p className="settings-description">Choose your app theme.</p>
              <ThemePicker theme={theme} onChange={onThemeChange} />
            </section>
            <section aria-labelledby="settings-clock">
              <h3 id="settings-clock" className="font-semibold mb-2">Date & time</h3>
              <label className="block text-sm" htmlFor="settings-timezone">Clock timezone</label>
              <p id="settings-timezone-help" className="settings-description">
                Philippines is the default. This changes the header clock only;
                task and transaction dates always use Philippine time.
              </p>
              <select
                id="settings-timezone"
                className="settings-select"
                aria-describedby="settings-timezone-help"
                value={timeZone}
                onChange={(event) => {
                  if (isTimeZone(event.target.value)) onTimeZoneChange(event.target.value);
                }}
              >
                {timeZones.map(({ id, label }) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </section>
          </div>
          <p className="settings-description mt-6">Changes are applied and saved automatically.</p>
        </div>
      </dialog>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { timeZones, type TimeZone } from "../core/useSettings";

export default function TimezoneClock({ timeZone }: Readonly<{ timeZone: TimeZone }>) {
  const [now, setNow] = useState(() => new Date());
  const zoneLabel = timeZones.find((zone) => zone.id === timeZone)?.label;

  const { dateFormatter, timeFormatter } = useMemo(() => ({
    dateFormatter: new Intl.DateTimeFormat("en-PH", {
      timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    timeFormatter: new Intl.DateTimeFormat("en-PH", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",

      hour12: true,

    }),
  }), [timeZone]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <time className="app-clock" dateTime={now.toISOString()} aria-label={`Current date and time in ${timeZone}`}>
      <span>{dateFormatter.format(now)}</span>
      <span className="app-clock-time">{timeFormatter.format(now)}</span>
      <span className="app-clock-zone">{zoneLabel}</span>
    </time>
  );
}

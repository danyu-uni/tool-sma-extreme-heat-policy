import type { DashboardCardSchedule } from "@/domain/dashboard";
import type { Weekday } from "@/domain/weeklyWindow";

export function formatWeekday(day: Weekday, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 0, 4 + day)));
}

export function formatMinutesOfDay(minutes: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 0, 1, 0, minutes)));
}

export function formatDashboardCardSchedule(
  schedule: DashboardCardSchedule,
  locale: string,
): string {
  const weekdays = new Intl.ListFormat(locale, {
    type: "conjunction",
    style: "narrow",
  }).format(
    [...schedule.weekdays]
      .sort((left, right) => left - right)
      .map((day) => formatWeekday(day, locale)),
  );
  const start = formatMinutesOfDay(schedule.startMinutes, locale);
  const end = formatMinutesOfDay(schedule.endMinutes, locale);

  return `${weekdays} · ${start} – ${end}`;
}

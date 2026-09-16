import type { DashboardCardSchedule } from "@/domain/dashboard";
import type { Weekday } from "@/domain/weeklyWindow";

const MINUTES_PER_DAY = 1440;

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
  formatNextDayTime: (time: string) => string,
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
  const endTime = formatMinutesOfDay(schedule.endMinutes, locale);
  const end =
    schedule.endMinutes === MINUTES_PER_DAY
      ? formatNextDayTime(endTime)
      : endTime;

  return `${weekdays} · ${start} – ${end}`;
}

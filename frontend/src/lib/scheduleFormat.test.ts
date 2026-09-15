import { describe, expect, it } from "vitest";
import {
  formatDashboardCardSchedule,
  formatMinutesOfDay,
  formatWeekday,
} from "@/lib/scheduleFormat";

describe("formatWeekday", () => {
  it.each([
    ["en-AU", 0, "Sun"],
    ["en-AU", 2, "Tue"],
    ["en-AU", 6, "Sat"],
    ["zh-CN", 0, "周日"],
    ["zh-CN", 2, "周二"],
  ] as const)("formats %s weekday %i as %s", (locale, day, label) => {
    expect(formatWeekday(day, locale)).toBe(label);
  });
});

describe("formatMinutesOfDay", () => {
  it.each([
    ["en-AU", 0, "12:00 am"],
    ["en-AU", 1080, "6:00 pm"],
    ["en-AU", 1440, "12:00 am"],
    ["zh-CN", 1080, "18:00"],
    ["zh-CN", 1440, "0:00"],
  ])("formats %s minute %i as %s", (locale, minutes, label) => {
    expect(formatMinutesOfDay(minutes, locale)).toBe(label);
  });
});

describe("formatDashboardCardSchedule", () => {
  it.each([
    ["en-AU", "Tue, Thu · 6:00 pm – 8:00 pm"],
    ["zh-CN", "周二、周四 · 18:00 – 20:00"],
  ])("formats a two-day evening schedule in %s", (locale, label) => {
    expect(
      formatDashboardCardSchedule(
        { weekdays: [4, 2], startMinutes: 1080, endMinutes: 1200 },
        locale,
      ),
    ).toBe(label);
  });

  it("formats a single day ending at midnight", () => {
    expect(
      formatDashboardCardSchedule(
        { weekdays: [6], startMinutes: 1260, endMinutes: 1440 },
        "zh-CN",
      ),
    ).toBe("周六 · 21:00 – 0:00");
  });

  it("does not reorder the schedule it was given", () => {
    const schedule = {
      weekdays: [4, 2] as const,
      startMinutes: 1080,
      endMinutes: 1200,
    };

    formatDashboardCardSchedule(schedule, "en-AU");

    expect(schedule.weekdays).toEqual([4, 2]);
  });
});

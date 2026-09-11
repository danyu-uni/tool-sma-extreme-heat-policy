export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WeeklyWindow {
  weekdays: readonly Weekday[];
  startMinutes: number;
  endMinutes: number;
  timeZone: string;
}

export interface ScheduledWindow {
  localDate: string;
  timeZone: string;
  startUtc: string;
  endUtc: string;
}

export type WeeklyWindowValidationError =
  | "invalid_weekdays"
  | "invalid_minutes"
  | "unsupported_overnight_window"
  | "invalid_time_zone";

export type NextWeeklyWindowResult =
  | { status: "ok"; window: ScheduledWindow }
  | {
      status: "invalid";
      reason: WeeklyWindowValidationError | "invalid_now";
    }
  | {
      status: "unresolved_local_time";
      reason: "nonexistent" | "ambiguous";
      localDate: string;
    };

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function createLocalClock(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export function validateWeeklyWindow(
  window: WeeklyWindow,
): WeeklyWindowValidationError | null {
  if (
    window.weekdays.length === 0 ||
    window.weekdays.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 6,
    ) ||
    new Set(window.weekdays).size !== window.weekdays.length
  ) {
    return "invalid_weekdays";
  }
  if (
    !Number.isInteger(window.startMinutes) ||
    !Number.isInteger(window.endMinutes) ||
    window.startMinutes < 0 ||
    window.startMinutes >= 1440 ||
    window.endMinutes <= 0 ||
    window.endMinutes > 1440 ||
    window.startMinutes === window.endMinutes
  ) {
    return "invalid_minutes";
  }
  if (window.endMinutes < window.startMinutes) {
    return "unsupported_overnight_window";
  }
  try {
    if (window.timeZone.trim().length === 0) return "invalid_time_zone";
    createLocalClock(window.timeZone);
  } catch {
    return "invalid_time_zone";
  }
  return null;
}

// A wall-clock timestamp is a calendar value, not an actual UTC instant.
function wallClockAt(clock: Intl.DateTimeFormat, instant: number): number {
  const parts = clock.formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
  );
}

function resolveWallClock(
  clock: Intl.DateTimeFormat,
  wallTime: number,
): number[] {
  const offsets = new Set<number>();
  // Sample both sides of nearby transitions, including non-hour DST changes.
  for (let hours = -48; hours <= 48; hours += 6) {
    const instant = wallTime + hours * HOUR_MS;
    offsets.add(wallClockAt(clock, instant) - instant);
  }
  return [...offsets]
    .map((offset) => wallTime - offset)
    .filter((instant) => wallClockAt(clock, instant) === wallTime)
    .sort((a, b) => a - b);
}

/**
 * Resolves the next window whose start is at or after now, in the location's
 * timezone. Already-started windows roll forward. DST gaps/folds are returned
 * explicitly; callers must not silently shift a user's selected time.
 * End minute 1440 means midnight following the selected weekday.
 */
export function getNextWeeklyWindow(
  window: WeeklyWindow,
  now: Date,
): NextWeeklyWindowResult {
  const reason = validateWeeklyWindow(window);
  if (reason) return { status: "invalid", reason };
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) {
    return { status: "invalid", reason: "invalid_now" };
  }

  const clock = createLocalClock(window.timeZone);
  const localNow = wallClockAt(clock, nowMs);
  const localMidnight = Math.floor(localNow / DAY_MS) * DAY_MS;

  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const day = localMidnight + dayOffset * DAY_MS;
    if (!window.weekdays.includes(new Date(day).getUTCDay() as Weekday))
      continue;

    const startWall = day + window.startMinutes * MINUTE_MS;
    const startInstants = resolveWallClock(clock, startWall);
    if (
      startInstants.length > 0
        ? startInstants.every((instant) => instant < nowMs)
        : startWall < localNow
    ) {
      continue;
    }

    const localDate = new Date(day).toISOString().slice(0, 10);
    const endInstants = resolveWallClock(
      clock,
      day + window.endMinutes * MINUTE_MS,
    );
    if (startInstants.length !== 1 || endInstants.length !== 1) {
      return {
        status: "unresolved_local_time",
        reason:
          startInstants.length === 0 || endInstants.length === 0
            ? "nonexistent"
            : "ambiguous",
        localDate,
      };
    }
    return {
      status: "ok",
      window: {
        localDate,
        timeZone: window.timeZone,
        startUtc: new Date(startInstants[0]).toISOString(),
        endUtc: new Date(endInstants[0]).toISOString(),
      },
    };
  }
  // A valid weekday always occurs within the inclusive eight-day search.
  throw new Error("Could not resolve a validated weekly window");
}

import type { BatchHeatRiskLocationResult } from "@/api/heatRiskBatch";
import type { ForecastApiPoint } from "@/api/heatRisk";
import {
  getNextWeeklyWindow,
  type ScheduledWindow,
  type WeeklyWindow,
} from "@/domain/weeklyWindow";
import { selectWeeklyWindowForecast } from "@/domain/weeklyWindowForecast";

export type WeeklyPreviewSource =
  | { status: "loading" | "unavailable" }
  | { status: "ok"; result: BatchHeatRiskLocationResult };

export type WeeklyPreviewResult =
  | { status: "ok"; window: ScheduledWindow; points: ForecastApiPoint[] }
  | { status: "incomplete_forecast"; window: ScheduledWindow }
  | {
      status:
        | "loading"
        | "unavailable"
        | "invalid_time_zone"
        | "invalid_window"
        | "unresolved_local_time"
        | "invalid_forecast";
    };

export function resolveWeeklyWindowPreview(
  draft: Omit<WeeklyWindow, "timeZone">,
  source: WeeklyPreviewSource,
  now: Date,
): WeeklyPreviewResult {
  if (source.status !== "ok") return { status: source.status };
  const { result } = source;
  if (result.status !== "ok" || !result.forecast)
    return { status: "unavailable" };
  if (!result.timezone) return { status: "invalid_time_zone" };
  const next = getNextWeeklyWindow(
    { ...draft, timeZone: result.timezone },
    now,
  );
  if (next.status === "invalid") {
    return {
      status:
        next.reason === "invalid_time_zone"
          ? "invalid_time_zone"
          : "invalid_window",
    };
  }
  if (next.status !== "ok") return { status: "unresolved_local_time" };
  const selected = selectWeeklyWindowForecast(result.forecast, next.window);
  if (selected.status === "ok") return { ...selected, window: next.window };
  if (selected.status === "incomplete_forecast")
    return { ...selected, window: next.window };
  return { status: selected.status };
}

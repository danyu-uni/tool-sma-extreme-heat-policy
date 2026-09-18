import type {
  DashboardCardQueryView,
  DashboardCardState,
} from "@/domain/dashboardCardState";
import {
  resolveDashboardCardQueryState,
  resolveWeeklyPreviewSourceFromQuery,
} from "@/domain/dashboardCardState";
import type { SavedDashboardCard } from "@/domain/dashboard";
import { toRiskLevel, type RiskLevel } from "@/domain/risk";
import type { ScheduledWindow } from "@/domain/weeklyWindow";
import { summarizeWeeklyWindowRisk } from "@/domain/weeklyWindowForecast";
import { resolveWeeklyWindowPreview } from "@/domain/weeklyWindowPreview";

type DashboardCardUnavailableState = Exclude<
  DashboardCardState,
  { status: "ok" }
>;

export type DashboardScheduledCardState =
  | DashboardCardUnavailableState
  | {
      status:
        | "missing_schedule"
        | "unavailable"
        | "invalid_time_zone"
        | "invalid_window"
        | "unresolved_local_time"
        | "incomplete_forecast"
        | "invalid_forecast";
    }
  | {
      status: "ok";
      window: ScheduledWindow;
      averageRiskScore: number;
      minRiskScore: number;
      maxRiskScore: number;
      averageRiskLevel: RiskLevel;
      minRiskLevel: RiskLevel;
      maxRiskLevel: RiskLevel;
    };

/**
 * Resolves the next saved schedule occurrence from the card's own forecast.
 */
export function resolveDashboardScheduledCardState(
  card: SavedDashboardCard,
  query: DashboardCardQueryView | undefined,
  now: Date,
): DashboardScheduledCardState {
  const cardState = resolveDashboardCardQueryState(query);

  if (cardState.status !== "ok") {
    return cardState;
  }

  if (!card.schedule) {
    return { status: "missing_schedule" };
  }

  const preview = resolveWeeklyWindowPreview(
    card.schedule,
    resolveWeeklyPreviewSourceFromQuery(query),
    now,
  );

  if (preview.status !== "ok") {
    return { status: preview.status };
  }

  const summary = summarizeWeeklyWindowRisk(preview.points);
  if (!summary) {
    return { status: "invalid_forecast" };
  }

  return {
    status: "ok",
    window: preview.window,
    ...summary,
    averageRiskLevel: toRiskLevel(summary.averageRiskScore),
    minRiskLevel: toRiskLevel(summary.minRiskScore),
    maxRiskLevel: toRiskLevel(summary.maxRiskScore),
  };
}

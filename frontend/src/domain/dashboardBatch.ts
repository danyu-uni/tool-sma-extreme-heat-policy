import type { BatchHeatRiskLocationResult } from "@/api/heatRiskBatch";
import { deriveDashboardRiskLevels } from "@/domain/dashboardForecast";
import type { RiskLevel } from "@/domain/risk";
import { toRiskLevel } from "@/domain/risk";
import { toBatchResultKey, type SavedDashboardCard } from "@/domain/dashboard";

export type DashboardBatchFetchErrorReason =
  | "missing_config"
  | "abort"
  | "http_status"
  | "invalid_response"
  | "network"
  | "weather_provider_unavailable";

export type DashboardCardState =
  | { status: "loading" }
  | {
      status: "batch_error";
      reason: DashboardBatchFetchErrorReason;
    }
  | {
      status: "location_error";
      errorCode: string | null;
      detail: string | null;
    }
  | {
      status: "missing_result";
    }
  | {
      status: "ok";
      currentRiskLevel: RiskLevel;
      todayMaxRiskLevel: RiskLevel;
    };

const DASHBOARD_CARD_ERROR_I18N_KEY_BY_CODE: Record<string, string> = {
  weather_provider_unavailable: "errors.risk.weatherProvider",
  unknown_inputs: "dashboard.cardErrors.unknownInputs",
  risk_calculation_failed: "dashboard.cardErrors.riskCalculationFailed",
};

const DASHBOARD_BATCH_ERROR_I18N_KEY_BY_REASON: Record<
  DashboardBatchFetchErrorReason,
  string
> = {
  missing_config: "errors.risk.missingApiBaseUrl",
  abort: "errors.risk.network",
  http_status: "errors.risk.network",
  invalid_response: "errors.risk.invalidResponse",
  network: "errors.risk.network",
  weather_provider_unavailable: "errors.risk.weatherProvider",
};

/**
 * Builds a stable React Query key segment from saved dashboard cards.
 *
 * Order is ignored so reordering cards does not refetch the same set.
 */
export function buildDashboardCardsKey(
  cards: readonly Pick<
    SavedDashboardCard,
    "sport" | "latitude" | "longitude"
  >[],
): string {
  return cards
    .map((card) => toBatchResultKey(card.sport, card.latitude, card.longitude))
    .sort()
    .join(";");
}

/**
 * Indexes batch location results by sport and normalized coordinate key.
 */
export function indexBatchResultsByCardKey(
  results: readonly BatchHeatRiskLocationResult[],
): Map<string, BatchHeatRiskLocationResult> {
  const indexedResults = new Map<string, BatchHeatRiskLocationResult>();

  for (const result of results) {
    indexedResults.set(
      toBatchResultKey(result.sport, result.latitude, result.longitude),
      result,
    );
  }

  return indexedResults;
}

/**
 * Maps a per-location batch error code to an i18n key.
 */
export function toDashboardCardErrorI18nKey(errorCode: string | null): string {
  if (errorCode && DASHBOARD_CARD_ERROR_I18N_KEY_BY_CODE[errorCode]) {
    return DASHBOARD_CARD_ERROR_I18N_KEY_BY_CODE[errorCode];
  }

  return "dashboard.cardErrors.generic";
}

/**
 * Maps a whole-batch fetch failure reason to an i18n key.
 */
export function toDashboardBatchErrorI18nKey(
  reason: DashboardBatchFetchErrorReason,
): string {
  return DASHBOARD_BATCH_ERROR_I18N_KEY_BY_REASON[reason];
}

/**
 * Resolves a saved card's state from an indexed batch response.
 */
export function resolveDashboardCardState(
  card: SavedDashboardCard,
  indexedResults: Map<string, BatchHeatRiskLocationResult> | null,
  options?: { isFetching?: boolean },
): DashboardCardState {
  const isFetching = options?.isFetching === true;

  if (!indexedResults) {
    return { status: isFetching ? "loading" : "missing_result" };
  }

  const batchResult = indexedResults.get(
    toBatchResultKey(card.sport, card.latitude, card.longitude),
  );

  if (!batchResult) {
    return { status: isFetching ? "loading" : "missing_result" };
  }

  if (batchResult.status === "error") {
    return {
      status: "location_error",
      errorCode: batchResult.error_code,
      detail: batchResult.detail,
    };
  }

  const derivedRiskLevels = deriveDashboardRiskLevels(batchResult.forecast);

  if (!derivedRiskLevels) {
    return {
      status: "location_error",
      errorCode: "risk_calculation_failed",
      detail: batchResult.detail,
    };
  }

  return {
    status: "ok",
    currentRiskLevel: toRiskLevel(
      derivedRiskLevels.currentRiskLevelInterpolated,
    ),
    todayMaxRiskLevel: toRiskLevel(
      derivedRiskLevels.todayMaxRiskLevelInterpolated,
    ),
  };
}

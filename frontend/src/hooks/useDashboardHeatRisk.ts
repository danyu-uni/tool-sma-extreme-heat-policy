import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ApiError, isApiError } from "@/api/apiErrors";
import { getRetryDelayMs, heatRiskRetryPolicy } from "@/api/apiRetryPolicy";
import { fetchHeatRiskBatch } from "@/api/heatRiskBatch";
import { DEFAULT_HEAT_RISK_PROFILE } from "@/domain/heatRiskProfile";
import {
  buildDashboardCardsKey,
  indexBatchResultsByCardKey,
  resolveDashboardCardState,
  type DashboardBatchFetchErrorReason,
  type DashboardCardState,
} from "@/domain/dashboardBatch";
import type { SavedDashboardCard } from "@/domain/dashboard";
import { toBatchResultKey } from "@/domain/dashboard";
import type { WeeklyPreviewSource } from "@/domain/weeklyWindowPreview";
import { useDashboardStore } from "@/store/dashboardStore";

interface UseDashboardHeatRiskResult {
  getWeeklyPreviewSource: (card: SavedDashboardCard) => WeeklyPreviewSource;
  getCardState: (card: SavedDashboardCard) => DashboardCardState;
  hasLoadedBatch: boolean;
  refresh: () => Promise<boolean>;
}

function toDashboardBatchFetchErrorReason(
  error: unknown,
): DashboardBatchFetchErrorReason | null {
  if (!isApiError(error)) {
    return null;
  }

  return error.serverCode === "weather_provider_unavailable"
    ? "weather_provider_unavailable"
    : error.kind;
}

/**
 * Fetches batch heat-risk forecasts for all saved dashboard cards.
 */
export function useDashboardHeatRisk(): UseDashboardHeatRiskResult {
  const cards = useDashboardStore((state) => state.cards);
  const profile = DEFAULT_HEAT_RISK_PROFILE;

  const requestLocations = useMemo(
    () =>
      cards.map((card) => ({
        sport: card.sport,
        latitude: card.latitude,
        longitude: card.longitude,
      })),
    [cards],
  );

  const cardsKey = buildDashboardCardsKey(cards);

  const batchQuery = useQuery({
    queryKey: ["heatRiskBatch", profile, cardsKey],
    queryFn: async ({ signal }) => {
      const result = await fetchHeatRiskBatch(
        {
          profile,
          locations: requestLocations,
        },
        { signal },
      );

      if (!result.ok) {
        throw new ApiError({
          kind:
            result.reason === "weather_provider_unavailable"
              ? "http_status"
              : result.reason,
          status: result.status,
          serverCode:
            result.reason === "weather_provider_unavailable"
              ? "weather_provider_unavailable"
              : undefined,
          message: result.reason,
        });
      }

      return result.data;
    },
    enabled: cards.length > 0,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) =>
      failureCount < heatRiskRetryPolicy.maxRetries &&
      heatRiskRetryPolicy.shouldRetry(error),
    retryDelay: () => getRetryDelayMs({ scope: "heat_risk" }),
    staleTime: 0,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const indexedResults = useMemo(
    () =>
      batchQuery.data
        ? indexBatchResultsByCardKey(batchQuery.data.locations)
        : null,
    [batchQuery.data],
  );

  const batchErrorReason = toDashboardBatchFetchErrorReason(batchQuery.error);
  const isInitialLoading =
    cards.length > 0 && batchQuery.isLoading && !batchQuery.data;
  const hasLoadedBatch = Boolean(
    cards.length > 0 && batchQuery.data && !batchQuery.isPlaceholderData,
  );

  async function refresh(): Promise<boolean> {
    if (cards.length === 0) {
      return false;
    }

    const result = await batchQuery.refetch();

    return !result.isError;
  }

  function getCardState(card: SavedDashboardCard): DashboardCardState {
    if (isInitialLoading) {
      return { status: "loading" };
    }

    if (batchErrorReason && !batchQuery.data) {
      return {
        status: "batch_error",
        reason: batchErrorReason,
      };
    }

    return resolveDashboardCardState(card, indexedResults, {
      isFetching: batchQuery.isFetching,
    });
  }

  return {
    getWeeklyPreviewSource: (card) => {
      if (batchQuery.isFetching || batchQuery.isPlaceholderData)
        return { status: "loading" };
      if (batchQuery.isError) return { status: "unavailable" };
      const result = indexedResults?.get(
        toBatchResultKey(card.sport, card.latitude, card.longitude),
      );
      return result ? { status: "ok", result } : { status: "unavailable" };
    },
    getCardState,
    hasLoadedBatch,
    refresh,
  };
}

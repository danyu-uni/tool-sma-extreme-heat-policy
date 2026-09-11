import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardHeatRisk } from "@/hooks/useDashboardHeatRisk";
import { sydneyCard, sydneyForecast } from "@/test/weeklyWindowFixtures";

const query = vi.hoisted(() => ({
  data: undefined as unknown,
  error: null,
  isLoading: false,
  isFetching: false,
  isPlaceholderData: false,
  isError: false,
}));

vi.mock("@tanstack/react-query", () => ({
  keepPreviousData: (data: unknown) => data,
  useQuery: () => query,
}));

beforeEach(() => {
  Object.assign(query, {
    data: { locations: [sydneyForecast()] },
    error: null,
    isLoading: false,
    isFetching: false,
    isPlaceholderData: false,
    isError: false,
  });
});

function readStatus(card = sydneyCard): string {
  function Probe() {
    return useDashboardHeatRisk().getWeeklyPreviewSource(card).status;
  }
  return renderToStaticMarkup(createElement(Probe));
}

describe("weekly preview query adapter", () => {
  it("returns the matching sport/location forecast", () => {
    expect(readStatus()).toBe("ok");
  });

  it.each(["isFetching", "isPlaceholderData"] as const)(
    "does not show cached risks while %s",
    (flag) => {
      query[flag] = true;
      expect(readStatus()).toBe("loading");
    },
  );

  it("does not show cached risks after a failed refresh", () => {
    query.isError = true;
    expect(readStatus()).toBe("unavailable");
  });

  it("returns unavailable before any result exists", () => {
    query.data = undefined;
    expect(readStatus()).toBe("unavailable");
  });

  it("does not substitute a different location's forecast", () => {
    expect(readStatus({ ...sydneyCard, latitude: -37.81 })).toBe("unavailable");
  });
});

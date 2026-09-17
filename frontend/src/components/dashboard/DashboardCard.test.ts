// @vitest-environment jsdom
import { act, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import type {
  DashboardCardSchedule,
  SavedDashboardCard,
} from "@/domain/dashboard";
import type { DashboardCardState } from "@/domain/dashboardBatch";
import { sydneyCard as baseSydneyCard } from "@/test/weeklyWindowFixtures";
import { createDashboardComponentHost } from "@/test/dashboardComponentHarness";

const sydneyCard: SavedDashboardCard = {
  ...baseSydneyCard,
  regionName: "New South Wales",
};

const eveningSchedule: DashboardCardSchedule = {
  weekdays: [2, 4],
  startMinutes: 1080,
  endMinutes: 1200,
};

const OK_CARD_STATE: DashboardCardState = {
  status: "ok",
  currentRiskScore: 1.4,
  todayMaxRiskScore: 2.8,
  currentRiskLevel: "low",
  todayMaxRiskLevel: "high",
};

const CARD_ACTIONS = {
  index: 0,
  totalCount: 1,
  onRemove: vi.fn(),
  onMoveUp: vi.fn(),
  onMoveDown: vi.fn(),
};

let harness: Awaited<ReturnType<typeof createDashboardComponentHost>>;

beforeEach(async () => {
  harness = await createDashboardComponentHost();
});

afterEach(() => {
  harness.cleanup();
  vi.clearAllMocks();
});

function renderCard(
  card: SavedDashboardCard = sydneyCard,
  viewMode: "now" | "my_schedule" | "other_time_period" = "now",
  cardState: DashboardCardState = OK_CARD_STATE,
) {
  harness.render(
    createElement(DashboardCard, {
      card,
      cardState,
      viewMode,
      ...CARD_ACTIONS,
    }),
  );
}

describe("DashboardCard", () => {
  it("renders stacked bar metrics in Now mode", () => {
    renderCard();

    expect(harness.host.textContent).toContain("Current");
    expect(
      harness.host.querySelector('[aria-label="Risk score 1.4, Low"]'),
    ).not.toBeNull();
    expect(harness.host.textContent).toContain("Max risk:");
  });

  it("renders schedule placeholder metrics outside Now mode", () => {
    renderCard(sydneyCard, "my_schedule");

    expect(harness.host.textContent).toContain("Average");
    expect(harness.host.textContent).toContain(
      "Average and range metrics will appear here once schedule calculations are connected.",
    );
    expect(harness.host.querySelector('[aria-label^="Risk score"]')).toBeNull();
  });

  it("renders selected-period placeholder metrics for other time period mode", () => {
    renderCard(sydneyCard, "other_time_period");

    expect(harness.host.textContent).toContain("Selected period");
    expect(harness.host.textContent).toContain(
      "Average and range metrics will appear here once the selected timeframe is connected.",
    );
  });

  it("shows batch errors instead of metrics placeholders", () => {
    renderCard(sydneyCard, "my_schedule", {
      status: "batch_error",
      reason: "network",
    });

    expect(harness.host.textContent).toContain(
      "Risk calculation is unavailable.",
    );
    expect(harness.host.textContent).not.toContain("Average");
  });
});

describe("dashboard card schedule", () => {
  it("shows the weekdays and times of a saved schedule", () => {
    renderCard({ ...sydneyCard, schedule: eveningSchedule });

    expect(harness.host.textContent).toContain("Tue, Thu · 6:00 pm – 8:00 pm");
  });

  it("marks an end time of midnight as the next day", () => {
    renderCard({
      ...sydneyCard,
      schedule: { weekdays: [6], startMinutes: 1260, endMinutes: 1440 },
    });

    expect(harness.host.textContent).toContain("Sat · 9:00 pm – 12:00 am (next day)");
  });

  it("translates the schedule when the language changes", () => {
    renderCard({ ...sydneyCard, schedule: eveningSchedule });

    act(() => {
      void harness.i18n.changeLanguage("zh-CN");
    });

    expect(harness.host.textContent).toContain("周二、周四 · 18:00 – 20:00");
  });

  it("shows no schedule line for a card saved without one", () => {
    renderCard(sydneyCard);

    expect(harness.host.textContent).toContain("New South Wales, Australia");
    expect(harness.host.textContent).not.toMatch(/\d:\d{2}\s*(am|pm)\s*–/i);
  });
});

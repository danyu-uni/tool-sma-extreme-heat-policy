// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardViewModeSelector } from "@/components/dashboard/DashboardViewModeSelector";
import { createDashboardComponentHost } from "@/test/dashboardComponentHarness";

let harness: Awaited<ReturnType<typeof createDashboardComponentHost>>;

beforeEach(async () => {
  harness = await createDashboardComponentHost();
});

afterEach(() => {
  harness.cleanup();
});

describe("DashboardViewModeSelector", () => {
  it("renders all dashboard view mode options", () => {
    harness.render(
      createElement(DashboardViewModeSelector, {
        value: "now",
        onChange: vi.fn(),
      }),
      { withRouter: false },
    );

    expect(harness.host.textContent).toContain("Now");
    expect(harness.host.textContent).toContain("My schedule");
    expect(harness.host.textContent).toContain("Other time period");
  });

  it("shows the placeholder hint for non-Now modes", () => {
    harness.render(
      createElement(DashboardViewModeSelector, {
        value: "my_schedule",
        onChange: vi.fn(),
      }),
      { withRouter: false },
    );

    expect(harness.host.textContent).toContain(
      "My schedule and other time period metrics are coming soon.",
    );
  });

  it("calls onChange when a different mode is selected", () => {
    const onChange = vi.fn();

    harness.render(
      createElement(DashboardViewModeSelector, {
        value: "now",
        onChange,
      }),
      { withRouter: false },
    );

    const scheduleOption = Array.from(
      harness.host.querySelectorAll("label"),
    ).find((label) => label.textContent === "My schedule");

    expect(scheduleOption).toBeDefined();
    scheduleOption?.click();

    expect(onChange).toHaveBeenCalledWith("my_schedule");
  });
});

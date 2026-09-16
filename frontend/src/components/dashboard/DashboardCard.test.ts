// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import type {
  DashboardCardSchedule,
  SavedDashboardCard,
} from "@/domain/dashboard";
import en from "@/i18n/locales/en/translation.json";
import zh from "@/i18n/locales/zh-CN/translation.json";

const sydneyCard: SavedDashboardCard = {
  id: "sydney",
  sport: "SOCCER",
  name: "Sydney",
  displayLabel: "Sydney, New South Wales, Australia",
  regionName: "New South Wales",
  countryName: "Australia",
  latitude: -33.86,
  longitude: 151.21,
};

const eveningSchedule: DashboardCardSchedule = {
  weekdays: [2, 4],
  startMinutes: 1080,
  endMinutes: 1200,
};

let root: Root;
let host: HTMLDivElement;
let language: ReturnType<typeof createInstance>;

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    })),
  );
  language = createInstance();
  await language.use(initReactI18next).init({
    initImmediate: false,
    lng: "en",
    fallbackLng: "en",
    resources: { en: { translation: en }, "zh-CN": { translation: zh } },
    interpolation: { escapeValue: false },
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function render(card: SavedDashboardCard) {
  act(() =>
    root.render(
      createElement(
        MemoryRouter,
        null,
        createElement(
          I18nextProvider,
          { i18n: language },
          createElement(
            MantineProvider,
            {
              env: "test",
              forceColorScheme: "light",
              withCssVariables: false,
              withGlobalClasses: false,
            },
            createElement(DashboardCard, {
              card,
              cardState: {
                status: "ok",
                currentRiskLevel: "moderate",
                todayMaxRiskLevel: "high",
              },
              index: 0,
              totalCount: 1,
              onRemove: vi.fn(),
              onMoveUp: vi.fn(),
              onMoveDown: vi.fn(),
            }),
          ),
        ),
      ),
    ),
  );
}

describe("dashboard card schedule", () => {
  it("shows the weekdays and times of a saved schedule", () => {
    render({ ...sydneyCard, schedule: eveningSchedule });

    expect(host.textContent).toContain("Tue, Thu · 6:00 pm – 8:00 pm");
  });

  it("marks an end time of midnight as the next day", () => {
    render({
      ...sydneyCard,
      schedule: { weekdays: [6], startMinutes: 1260, endMinutes: 1440 },
    });

    expect(host.textContent).toContain("Sat · 9:00 pm – 12:00 am (next day)");
  });

  it("translates the schedule when the language changes", () => {
    render({ ...sydneyCard, schedule: eveningSchedule });

    act(() => {
      void language.changeLanguage("zh-CN");
    });

    expect(host.textContent).toContain("周二、周四 · 18:00 – 20:00");
  });

  it("shows no schedule line for a card saved without one", () => {
    render(sydneyCard);

    expect(host.textContent).toContain("New South Wales, Australia");
    expect(host.textContent).not.toContain("·");
  });
});

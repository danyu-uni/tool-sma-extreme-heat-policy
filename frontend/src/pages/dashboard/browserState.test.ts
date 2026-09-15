import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_DASHBOARD_CARDS,
  type SavedDashboardCard,
} from "@/domain/dashboard";
import { SportType, SPORT_TYPE_VALUES } from "@/domain/sport";
import {
  loadPersistedDashboardState,
  savePersistedDashboardState,
} from "@/pages/dashboard/browserState";

const DASHBOARD_STORAGE_KEY = "dashboard-cards:v1";

const SYDNEY_CARD: SavedDashboardCard = {
  id: "card-sydney",
  sport: SportType.Soccer,
  displayLabel: "Sydney, New South Wales, Australia",
  name: "Sydney",
  regionName: "New South Wales",
  countryName: "Australia",
  latitude: -33.847,
  longitude: 151.067,
  mapboxId: "mapbox-sydney",
};

const MELBOURNE_CARD: SavedDashboardCard = {
  id: "card-melbourne",
  sport: SportType.Running,
  displayLabel: "Melbourne, Victoria, Australia",
  name: "Melbourne",
  regionName: "Victoria",
  countryName: "Australia",
  latitude: -37.813,
  longitude: 144.963,
  mapboxId: "mapbox-melbourne",
};

function installWindowMock(): Map<string, string> {
  const storage = new Map<string, string>();

  vi.stubGlobal("window", {
    localStorage: {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => {
        storage.delete(key);
      },
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    },
  });

  return storage;
}

function persistRawCards(storage: Map<string, string>, cards: unknown): void {
  storage.set(DASHBOARD_STORAGE_KEY, JSON.stringify({ cards }));
}

describe("dashboard browserState", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = installWindowMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads the cards it previously saved", () => {
    savePersistedDashboardState({ cards: [SYDNEY_CARD, MELBOURNE_CARD] });

    expect(loadPersistedDashboardState(SPORT_TYPE_VALUES)).toEqual({
      cards: [SYDNEY_CARD, MELBOURNE_CARD],
    });
  });

  it("keeps the valid cards when one card is invalid", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    persistRawCards(storage, [
      SYDNEY_CARD,
      { ...MELBOURNE_CARD, latitude: "not-a-number" },
      MELBOURNE_CARD,
    ]);

    expect(loadPersistedDashboardState(SPORT_TYPE_VALUES)).toEqual({
      cards: [SYDNEY_CARD, MELBOURNE_CARD],
    });
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("drops a card whose sport is no longer supported", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    persistRawCards(storage, [
      SYDNEY_CARD,
      { ...MELBOURNE_CARD, sport: "removed-sport" },
    ]);

    expect(loadPersistedDashboardState(SPORT_TYPE_VALUES)).toEqual({
      cards: [SYDNEY_CARD],
    });
  });

  it("does not warn when every card is valid", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    persistRawCards(storage, [SYDNEY_CARD]);

    loadPersistedDashboardState(SPORT_TYPE_VALUES);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns null when the saved cards are not a list", () => {
    persistRawCards(storage, { id: "card-sydney" });

    expect(loadPersistedDashboardState(SPORT_TYPE_VALUES)).toBeNull();
  });

  it("returns null when nothing has been saved", () => {
    expect(loadPersistedDashboardState(SPORT_TYPE_VALUES)).toBeNull();
  });

  it("caps the loaded cards at the dashboard limit", () => {
    const cards = Array.from(
      { length: MAX_DASHBOARD_CARDS + 1 },
      (_, index) => ({ ...SYDNEY_CARD, id: `card-${index}` }),
    );
    persistRawCards(storage, cards);

    expect(loadPersistedDashboardState(SPORT_TYPE_VALUES)?.cards).toHaveLength(
      MAX_DASHBOARD_CARDS,
    );
  });
});

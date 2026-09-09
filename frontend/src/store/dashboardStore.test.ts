import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isDuplicateSavedDashboardCard,
  validateAddSavedDashboardCard,
} from "@/domain/dashboard";
import type { LocationSuggestion } from "@/domain/location";
import { SportType } from "@/domain/sport";
import { useDashboardStore } from "@/store/dashboardStore";

const SYDNEY_LOCATION: LocationSuggestion = {
  id: "suggestion-sydney",
  displayLabel: "Sydney, New South Wales, Australia",
  name: "Sydney",
  regionName: "New South Wales",
  countryName: "Australia",
  mapboxId: "mapbox-sydney",
  latitude: -33.847,
  longitude: 151.067,
};

const MELBOURNE_LOCATION: LocationSuggestion = {
  id: "suggestion-melbourne",
  displayLabel: "Melbourne, Victoria, Australia",
  name: "Melbourne",
  regionName: "Victoria",
  countryName: "Australia",
  mapboxId: "mapbox-melbourne",
  latitude: -37.813,
  longitude: 144.963,
};

function resetDashboardStore() {
  useDashboardStore.setState({
    isBootstrapped: false,
    draftSport: SportType.Soccer,
    draftLocation: null,
    cards: [],
    locationSearchInput: "",
    locationSessionToken: "session-initial",
  });
}

describe("dashboardStore", () => {
  beforeEach(() => {
    resetDashboardStore();
  });

  afterEach(() => {
    resetDashboardStore();
  });

  it("bootstraps with persisted cards", () => {
    useDashboardStore.getState().bootstrap({
      cards: [
        {
          id: "card-1",
          sport: SportType.Cricket,
          displayLabel: SYDNEY_LOCATION.displayLabel,
          name: SYDNEY_LOCATION.name,
          regionName: SYDNEY_LOCATION.regionName,
          countryName: SYDNEY_LOCATION.countryName,
          latitude: SYDNEY_LOCATION.latitude as number,
          longitude: SYDNEY_LOCATION.longitude as number,
        },
      ],
    });

    expect(useDashboardStore.getState()).toMatchObject({
      isBootstrapped: true,
      cards: [
        expect.objectContaining({
          name: "Sydney",
          sport: SportType.Cricket,
        }),
      ],
    });
  });

  it("adds, reorders, and removes saved cards", () => {
    expect(
      useDashboardStore.getState().addCard(SportType.Soccer, SYDNEY_LOCATION),
    ).toEqual({
      ok: true,
    });
    expect(
      useDashboardStore
        .getState()
        .addCard(SportType.Soccer, MELBOURNE_LOCATION),
    ).toEqual({
      ok: true,
    });

    const [firstCard] = useDashboardStore.getState().cards;
    useDashboardStore.getState().moveCardDown(firstCard.id);

    expect(useDashboardStore.getState().cards.map((card) => card.name)).toEqual(
      ["Melbourne", "Sydney"],
    );

    useDashboardStore.getState().removeCard(firstCard.id);

    expect(useDashboardStore.getState().cards).toHaveLength(1);
    expect(useDashboardStore.getState().cards[0]?.name).toBe("Melbourne");
  });

  it("allows the same location for different sports", () => {
    expect(
      useDashboardStore.getState().addCard(SportType.Soccer, SYDNEY_LOCATION),
    ).toEqual({
      ok: true,
    });
    expect(
      useDashboardStore.getState().addCard(SportType.Cricket, SYDNEY_LOCATION),
    ).toEqual({
      ok: true,
    });

    expect(useDashboardStore.getState().cards).toHaveLength(2);
  });

  it("rejects duplicate cards for the same sport and location", () => {
    expect(
      validateAddSavedDashboardCard([], SportType.Soccer, SYDNEY_LOCATION),
    ).toEqual({
      ok: true,
    });

    useDashboardStore.getState().addCard(SportType.Soccer, SYDNEY_LOCATION);

    expect(
      isDuplicateSavedDashboardCard(useDashboardStore.getState().cards, {
        sport: SportType.Soccer,
        latitude: SYDNEY_LOCATION.latitude as number,
        longitude: SYDNEY_LOCATION.longitude as number,
        mapboxId: SYDNEY_LOCATION.mapboxId,
      }),
    ).toBe(true);

    expect(
      useDashboardStore.getState().addCard(SportType.Soccer, SYDNEY_LOCATION),
    ).toEqual({
      ok: false,
      reason: "duplicate",
    });
  });
});

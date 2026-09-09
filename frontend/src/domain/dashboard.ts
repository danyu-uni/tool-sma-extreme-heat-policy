import type { LocationSuggestion } from "@/domain/location";
import type { SportType } from "@/domain/sport";

export const MAX_DASHBOARD_CARDS = 6;
export const COORDINATE_KEY_DECIMALS = 6;

export interface SavedDashboardCard {
  id: string;
  sport: SportType;
  displayLabel: string;
  name: string;
  regionName?: string;
  countryName: string;
  latitude: number;
  longitude: number;
  mapboxId?: string;
}

export type AddDashboardCardFailureReason =
  | "duplicate"
  | "max_reached"
  | "missing_coordinates";

export type AddDashboardCardResult =
  | { ok: true }
  | { ok: false; reason: AddDashboardCardFailureReason };

export function toCoordinateKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(COORDINATE_KEY_DECIMALS)}|${longitude.toFixed(COORDINATE_KEY_DECIMALS)}`;
}

/**
 * Builds a stable batch lookup key from sport and normalized coordinates.
 */
export function toBatchResultKey(
  sport: SportType,
  latitude: number,
  longitude: number,
): string {
  return `${sport}|${toCoordinateKey(latitude, longitude)}`;
}

/**
 * Builds the secondary city label shown beneath the primary city name on cards.
 */
export function formatSavedDashboardCardSubtitle(
  card: Pick<SavedDashboardCard, "name" | "regionName" | "countryName">,
): string {
  return [card.regionName, card.countryName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(", ");
}

/**
 * Builds the home page URL for a saved dashboard card.
 */
export function buildDashboardHomePath(
  sport: SportType,
  displayLabel: string,
): string {
  const searchParams = new URLSearchParams();
  searchParams.set("sport", sport);
  searchParams.set("loc", displayLabel);

  return `/?${searchParams.toString()}`;
}

export function canAddDashboardCard(
  cards: readonly SavedDashboardCard[],
): boolean {
  return cards.length < MAX_DASHBOARD_CARDS;
}

/**
 * Returns true when the candidate matches a saved card by sport and place.
 */
export function isDuplicateSavedDashboardCard(
  cards: readonly SavedDashboardCard[],
  candidate: Pick<
    SavedDashboardCard,
    "sport" | "latitude" | "longitude" | "mapboxId"
  >,
): boolean {
  const candidateKey = toBatchResultKey(
    candidate.sport,
    candidate.latitude,
    candidate.longitude,
  );

  return cards.some((card) => {
    if (card.sport !== candidate.sport) {
      return false;
    }

    if (
      card.mapboxId &&
      candidate.mapboxId &&
      card.mapboxId === candidate.mapboxId
    ) {
      return true;
    }

    return (
      toBatchResultKey(card.sport, card.latitude, card.longitude) ===
      candidateKey
    );
  });
}

function createDashboardCardId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `dashboard-card-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Builds a persisted dashboard card from a resolved Mapbox suggestion.
 */
export function createSavedDashboardCardFromSuggestion(
  sport: SportType,
  suggestion: LocationSuggestion & { latitude: number; longitude: number },
): SavedDashboardCard {
  return {
    id: createDashboardCardId(),
    sport,
    displayLabel: suggestion.displayLabel,
    name: suggestion.name,
    regionName: suggestion.regionName,
    countryName: suggestion.countryName,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    mapboxId: suggestion.mapboxId,
  };
}

/**
 * Validates whether a resolved suggestion can be appended to the dashboard list.
 */
export function validateAddSavedDashboardCard(
  cards: readonly SavedDashboardCard[],
  sport: SportType,
  suggestion: LocationSuggestion,
): AddDashboardCardResult {
  if (!canAddDashboardCard(cards)) {
    return { ok: false, reason: "max_reached" };
  }

  if (suggestion.latitude === undefined || suggestion.longitude === undefined) {
    return { ok: false, reason: "missing_coordinates" };
  }

  if (
    isDuplicateSavedDashboardCard(cards, {
      sport,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      mapboxId: suggestion.mapboxId,
    })
  ) {
    return { ok: false, reason: "duplicate" };
  }

  return { ok: true };
}

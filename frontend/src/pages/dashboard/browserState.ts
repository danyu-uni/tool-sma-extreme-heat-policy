import {
  MAX_DASHBOARD_CARDS,
  type SavedDashboardCard,
} from "@/domain/dashboard";
import { DEFAULT_SPORT_TYPE, type SportType } from "@/domain/sport";
import { isValidPersistedSport } from "@/pages/home/browserState";

const DASHBOARD_STORAGE_KEY = "dashboard-cards:v1";

export interface PersistedDashboardState {
  cards: SavedDashboardCard[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidSavedDashboardCard(
  value: unknown,
  allowedSports: readonly SportType[],
): value is SavedDashboardCard {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    isValidPersistedSport(value.sport, allowedSports) &&
    typeof value.displayLabel === "string" &&
    value.displayLabel.length > 0 &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    typeof value.countryName === "string" &&
    value.countryName.length > 0 &&
    typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude) &&
    (value.regionName === undefined || typeof value.regionName === "string") &&
    (value.mapboxId === undefined || typeof value.mapboxId === "string")
  );
}

/**
 * Loads and validates persisted dashboard state from localStorage.
 */
export function loadPersistedDashboardState(
  allowedSports: readonly SportType[],
): PersistedDashboardState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    const cards = parsed.cards;

    if (
      !Array.isArray(cards) ||
      !cards.every((card) => isValidSavedDashboardCard(card, allowedSports))
    ) {
      return null;
    }

    return {
      cards: cards.slice(0, MAX_DASHBOARD_CARDS),
    };
  } catch {
    return null;
  }
}

/**
 * Persists the latest dashboard card list into localStorage (best-effort).
 */
export function savePersistedDashboardState(
  state: PersistedDashboardState,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: PersistedDashboardState = {
      cards: state.cards,
    };

    window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Intentionally ignore storage errors to keep UI interaction unblocked.
  }
}

/**
 * Resolves the initial saved cards list from persisted state.
 */
export function resolveInitialDashboardCards(
  persistedState: PersistedDashboardState | null,
): SavedDashboardCard[] {
  return persistedState?.cards ?? [];
}

/**
 * Resolves the initial draft sport from persisted cards or app defaults.
 */
export function resolveInitialDashboardDraftSport(
  persistedState: PersistedDashboardState | null,
): SportType {
  return persistedState?.cards[0]?.sport ?? DEFAULT_SPORT_TYPE;
}

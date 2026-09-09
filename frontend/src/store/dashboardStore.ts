import { create } from "zustand";
import type { LocationSuggestion } from "@/domain/location";
import {
  createSavedDashboardCardFromSuggestion,
  type AddDashboardCardResult,
  type SavedDashboardCard,
  validateAddSavedDashboardCard,
} from "@/domain/dashboard";
import { DEFAULT_SPORT_TYPE, type SportType } from "@/domain/sport";

export interface DashboardStoreBootstrapPayload {
  cards: SavedDashboardCard[];
  draftSport?: SportType;
}

interface DashboardStoreState {
  isBootstrapped: boolean;
  draftSport: SportType;
  draftLocation: LocationSuggestion | null;
  cards: SavedDashboardCard[];
  locationSearchInput: string;
  locationSessionToken: string;

  bootstrap: (payload: DashboardStoreBootstrapPayload) => void;
  setDraftSport: (sport: SportType) => void;
  setDraftLocation: (suggestion: LocationSuggestion | null) => void;
  setLocationSearchInput: (value: string) => void;
  addCard: (
    sport: SportType,
    suggestion: LocationSuggestion,
  ) => AddDashboardCardResult;
  removeCard: (cardId: string) => void;
  moveCardUp: (cardId: string) => void;
  moveCardDown: (cardId: string) => void;
}

function createSessionToken(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function reorderCards(
  cards: SavedDashboardCard[],
  cardId: string,
  direction: -1 | 1,
): SavedDashboardCard[] {
  const currentIndex = cards.findIndex((card) => card.id === cardId);

  if (currentIndex === -1) {
    return cards;
  }

  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= cards.length) {
    return cards;
  }

  const nextCards = [...cards];
  const [movedCard] = nextCards.splice(currentIndex, 1);
  nextCards.splice(targetIndex, 0, movedCard);
  return nextCards;
}

/**
 * Central dashboard store for saved cards and add-location UI state.
 */
export const useDashboardStore = create<DashboardStoreState>((set, get) => ({
  isBootstrapped: false,
  draftSport: DEFAULT_SPORT_TYPE,
  draftLocation: null,
  cards: [],
  locationSearchInput: "",
  locationSessionToken: createSessionToken(),

  bootstrap: ({ cards, draftSport }) => {
    set({
      isBootstrapped: true,
      cards,
      draftSport: draftSport ?? DEFAULT_SPORT_TYPE,
      draftLocation: null,
      locationSearchInput: "",
      locationSessionToken: createSessionToken(),
    });
  },

  setDraftSport: (sport) => {
    set({ draftSport: sport });
  },

  setDraftLocation: (suggestion) => {
    set({
      draftLocation: suggestion,
      locationSearchInput: suggestion?.displayLabel ?? "",
    });
  },

  setLocationSearchInput: (value) => {
    const trimmedValue = value.trim();
    const previousValue = get().locationSearchInput.trim();
    const shouldRefreshSessionToken =
      trimmedValue.length > 0 && previousValue.length === 0;
    const draftLocation = get().draftLocation;
    const shouldKeepDraftLocation =
      draftLocation !== null &&
      trimmedValue === draftLocation.displayLabel.trim();

    set((state) => ({
      locationSearchInput: value,
      draftLocation: shouldKeepDraftLocation ? draftLocation : null,
      locationSessionToken: shouldRefreshSessionToken
        ? createSessionToken()
        : state.locationSessionToken,
    }));
  },

  addCard: (sport, suggestion) => {
    const validation = validateAddSavedDashboardCard(
      get().cards,
      sport,
      suggestion,
    );
    if (!validation.ok) {
      return validation;
    }

    const savedCard = createSavedDashboardCardFromSuggestion(sport, {
      ...suggestion,
      latitude: suggestion.latitude as number,
      longitude: suggestion.longitude as number,
    });

    set((state) => ({
      cards: [...state.cards, savedCard],
      locationSearchInput: "",
      draftLocation: null,
    }));

    return { ok: true };
  },

  removeCard: (cardId) => {
    set((state) => ({
      cards: state.cards.filter((card) => card.id !== cardId),
    }));
  },

  moveCardUp: (cardId) => {
    set((state) => ({
      cards: reorderCards(state.cards, cardId, -1),
    }));
  },

  moveCardDown: (cardId) => {
    set((state) => ({
      cards: reorderCards(state.cards, cardId, 1),
    }));
  },
}));

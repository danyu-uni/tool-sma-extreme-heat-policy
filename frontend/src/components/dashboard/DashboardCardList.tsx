import { SimpleGrid, Stack } from "@mantine/core";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { CONTENT_GAP } from "@/config/uiLayout";
import type { SavedDashboardCard } from "@/domain/dashboard";
import type { DashboardCardState } from "@/domain/dashboardBatch";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { useDashboardStore } from "@/store/dashboardStore";

interface DashboardCardListProps {
  cards: SavedDashboardCard[];
  getCardState: (card: SavedDashboardCard) => DashboardCardState;
}

/**
 * Renders saved dashboard cards in a responsive grid or vertical list.
 */
export function DashboardCardList({
  cards,
  getCardState,
}: DashboardCardListProps) {
  const isMobile = useIsMobileViewport();
  const removeCard = useDashboardStore((state) => state.removeCard);
  const moveCardUp = useDashboardStore((state) => state.moveCardUp);
  const moveCardDown = useDashboardStore((state) => state.moveCardDown);

  const renderCard = (card: SavedDashboardCard, index: number) => (
    <DashboardCard
      key={card.id}
      card={card}
      cardState={getCardState(card)}
      index={index}
      totalCount={cards.length}
      onRemove={() => removeCard(card.id)}
      onMoveUp={() => moveCardUp(card.id)}
      onMoveDown={() => moveCardDown(card.id)}
    />
  );

  if (isMobile) {
    return (
      <Stack gap={CONTENT_GAP}>
        {cards.map((card, index) => renderCard(card, index))}
      </Stack>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={CONTENT_GAP}>
      {cards.map((card, index) => renderCard(card, index))}
    </SimpleGrid>
  );
}

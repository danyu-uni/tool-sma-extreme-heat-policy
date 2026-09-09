import { ActionIcon, Group, Tooltip } from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  DASHBOARD_CARD_CONTROL_LAYER_Z_INDEX,
  UI_INLINE_ICON_SIZE,
  UI_INLINE_ICON_STROKE,
} from "@/config/uiScale";

interface DashboardCardActionsProps {
  index: number;
  totalCount: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

/**
 * Renders delete and reorder controls for a dashboard card.
 */
export function DashboardCardActions({
  index,
  totalCount,
  onRemove,
  onMoveUp,
  onMoveDown,
}: DashboardCardActionsProps) {
  const { t } = useTranslation();
  const canMoveUp = index > 0;
  const canMoveDown = index < totalCount - 1;

  const stopPropagation = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  };

  const handleRemove = (event: { stopPropagation: () => void }) => {
    stopPropagation(event);
    onRemove();
  };

  const handleMoveUp = (event: { stopPropagation: () => void }) => {
    stopPropagation(event);
    onMoveUp();
  };

  const handleMoveDown = (event: { stopPropagation: () => void }) => {
    stopPropagation(event);
    onMoveDown();
  };

  return (
    <Group
      gap={4}
      wrap="nowrap"
      style={{
        flexShrink: 0,
        zIndex: DASHBOARD_CARD_CONTROL_LAYER_Z_INDEX,
      }}
    >
      <Tooltip label={t("dashboard.cards.moveLeft")}>
        <ActionIcon
          variant="light"
          color="gray"
          size="sm"
          aria-label={t("dashboard.cards.moveLeft")}
          disabled={!canMoveUp}
          onClick={handleMoveUp}
        >
          <IconChevronLeft
            size={UI_INLINE_ICON_SIZE}
            stroke={UI_INLINE_ICON_STROKE}
          />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t("dashboard.cards.moveRight")}>
        <ActionIcon
          variant="light"
          color="gray"
          size="sm"
          aria-label={t("dashboard.cards.moveRight")}
          disabled={!canMoveDown}
          onClick={handleMoveDown}
        >
          <IconChevronRight
            size={UI_INLINE_ICON_SIZE}
            stroke={UI_INLINE_ICON_STROKE}
          />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t("dashboard.cards.delete")}>
        <ActionIcon
          variant="light"
          color="red"
          size="sm"
          aria-label={t("dashboard.cards.delete")}
          onClick={handleRemove}
        >
          <IconTrash
            size={UI_INLINE_ICON_SIZE}
            stroke={UI_INLINE_ICON_STROKE}
          />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

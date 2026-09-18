import { Box, Group, Paper, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  DashboardCardTodayLine,
  DashboardMetricColumnLabel,
} from "@/components/dashboard/DashboardCardMetrics";
import { DashboardCardActions } from "@/components/dashboard/DashboardCardActions";
import { DashboardCardSkeleton } from "@/components/dashboard/DashboardSkeletons";
import { RiskStackedBar } from "@/components/dashboard/RiskStackedBar";
import {
  buildDashboardHomePath,
  type SavedDashboardCard,
} from "@/domain/dashboard";
import { type DashboardCardState } from "@/domain/dashboardCardState";
import {
  toDashboardFetchErrorI18nKey,
  toDashboardLocationErrorI18nKey,
} from "@/domain/dashboardErrorMap";
import type { DashboardViewMode } from "@/domain/dashboardViewMode";
import { sports } from "@/domain/sport";
import { toIntlLocale } from "@/i18n/language";
import { formatDashboardCardSchedule } from "@/lib/scheduleFormat";
import { CONTENT_PADDING } from "@/config/uiLayout";
import {
  DASHBOARD_CARD_CONTROL_LAYER_Z_INDEX,
  DASHBOARD_CARD_HIT_LAYER_Z_INDEX,
} from "@/config/uiScale";

interface DashboardCardProps {
  card: SavedDashboardCard;
  cardState: DashboardCardState;
  viewMode: DashboardViewMode;
  index: number;
  totalCount: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function DashboardCardStatusMessage({
  cardState,
}: {
  cardState: DashboardCardState;
}) {
  const { t } = useTranslation();

  if (cardState.status === "fetch_error") {
    return (
      <Text c="dimmed" fz="sm">
        {t(
          toDashboardFetchErrorI18nKey(cardState.reason) ??
            "dashboard.cardErrors.generic",
        )}
      </Text>
    );
  }

  if (cardState.status === "location_error") {
    return (
      <Text c="dimmed" fz="sm">
        {t(toDashboardLocationErrorI18nKey(cardState.errorCode))}
      </Text>
    );
  }

  return (
    <Text c="dimmed" fz="sm">
      {t("dashboard.cardErrors.missingResult")}
    </Text>
  );
}

function DashboardCardMetricsContent({
  cardState,
  viewMode,
}: {
  cardState: DashboardCardState;
  viewMode: DashboardViewMode;
}) {
  const { t } = useTranslation();

  if (cardState.status !== "ok") {
    return <DashboardCardStatusMessage cardState={cardState} />;
  }

  if (viewMode === "now") {
    return (
      <Stack gap={4}>
        <DashboardMetricColumnLabel>
          {t("dashboard.cards.metrics.current")}
        </DashboardMetricColumnLabel>
        <RiskStackedBar score={cardState.currentRiskScore} />
        <DashboardCardTodayLine
          score={cardState.todayMaxRiskScore}
          level={cardState.todayMaxRiskLevel}
        />
      </Stack>
    );
  }

  const placeholderKey =
    viewMode === "my_schedule"
      ? "dashboard.viewMode.myScheduleCardPlaceholder"
      : "dashboard.viewMode.otherTimePeriodCardPlaceholder";

  return (
    <Stack gap={4}>
      <DashboardMetricColumnLabel>
        {viewMode === "my_schedule"
          ? t("dashboard.cards.metrics.average")
          : t("dashboard.viewMode.otherTimePeriodMetricLabel")}
      </DashboardMetricColumnLabel>
      <Text c="dimmed" fz="sm">
        {t(placeholderKey)}
      </Text>
    </Stack>
  );
}

function DashboardCardHeader({
  homePath,
  title,
  scheduleLabel,
  openHomeAriaLabel,
  lineClamp,
  actions,
}: {
  homePath: string;
  title: string;
  scheduleLabel: string | null;
  openHomeAriaLabel: string;
  lineClamp: number;
  actions: ReactNode;
}) {
  return (
    <Stack gap={4}>
      <Group wrap="nowrap" align="center" gap="xs">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <DashboardCardTitleLink
            homePath={homePath}
            title={title}
            ariaLabel={openHomeAriaLabel}
            lineClamp={lineClamp}
          />
        </Box>
        {actions}
      </Group>
      {scheduleLabel ? (
        <Text c="dimmed" fz="sm" lineClamp={lineClamp}>
          {scheduleLabel}
        </Text>
      ) : null}
    </Stack>
  );
}

function DashboardCardTitleLink({
  homePath,
  title,
  ariaLabel,
  lineClamp,
}: {
  homePath: string;
  title: string;
  ariaLabel: string;
  lineClamp: number;
}) {
  return (
    <Text
      component={Link}
      to={homePath}
      fw={700}
      lineClamp={lineClamp}
      aria-label={ariaLabel}
      c="inherit"
      pos="relative"
      style={{
        textDecoration: "none",
        zIndex: DASHBOARD_CARD_CONTROL_LAYER_Z_INDEX,
      }}
    >
      {title}
    </Text>
  );
}

function DashboardCardHomeOverlay({ homePath }: { homePath: string }) {
  return (
    <Link
      to={homePath}
      tabIndex={-1}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: DASHBOARD_CARD_HIT_LAYER_Z_INDEX,
      }}
    />
  );
}

/**
 * Renders a saved dashboard card with stacked-bar metrics in Now mode.
 */
export function DashboardCard({
  card,
  cardState,
  viewMode,
  index,
  totalCount,
  onRemove,
  onMoveUp,
  onMoveDown,
}: DashboardCardProps) {
  const { t, i18n } = useTranslation();
  const sportLabel = useMemo(() => {
    const sportMeta = sports.find((meta) => meta.type === card.sport);

    return sportMeta
      ? t(sportMeta.labelKey)
      : t("home.sections.filters.selectedSportFallback");
  }, [card.sport, t]);
  const cardTitle = t("dashboard.cards.title", {
    sport: sportLabel,
    location: card.name,
  });
  const scheduleLabel = card.schedule
    ? formatDashboardCardSchedule(
        card.schedule,
        toIntlLocale(i18n.resolvedLanguage),
        (time) => t("dashboard.cards.nextDayTime", { time }),
      )
    : null;
  const homePath = buildDashboardHomePath(card.sport, card.displayLabel);
  const openHomeAriaLabel = t("dashboard.cards.openHomeAriaLabel", {
    title: cardTitle,
  });

  if (cardState.status === "loading") {
    return <DashboardCardSkeleton />;
  }

  const cardActionsProps = {
    index,
    totalCount,
    onRemove,
    onMoveUp,
    onMoveDown,
  };

  return (
    <Box pos="relative">
      <Paper
        withBorder
        pos="relative"
        radius="md"
        p={CONTENT_PADDING.base}
        style={{
          minHeight: 168,
          cursor: "pointer",
        }}
      >
        <Stack gap="sm">
          <DashboardCardHeader
            homePath={homePath}
            title={cardTitle}
            scheduleLabel={scheduleLabel}
            openHomeAriaLabel={openHomeAriaLabel}
            lineClamp={2}
            actions={<DashboardCardActions {...cardActionsProps} />}
          />
          <DashboardCardMetricsContent
            cardState={cardState}
            viewMode={viewMode}
          />
        </Stack>
        <DashboardCardHomeOverlay homePath={homePath} />
      </Paper>
    </Box>
  );
}

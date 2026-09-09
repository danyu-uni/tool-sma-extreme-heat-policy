import { Badge, Box, Group, Paper, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DashboardCardActions } from "@/components/dashboard/DashboardCardActions";
import { DashboardCardSkeleton } from "@/components/dashboard/DashboardSkeletons";
import {
  buildDashboardHomePath,
  formatSavedDashboardCardSubtitle,
  type SavedDashboardCard,
} from "@/domain/dashboard";
import {
  toDashboardBatchErrorI18nKey,
  toDashboardCardErrorI18nKey,
  type DashboardCardState,
} from "@/domain/dashboardBatch";
import { createRiskLevelLabels } from "@/domain/riskLabels";
import type { RiskLevel } from "@/domain/risk";
import {
  getRiskBadgeForegroundColor,
  getRiskColor,
  getRiskLevelI18nKeys,
} from "@/domain/riskRegistry";
import { sports } from "@/domain/sport";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { CONTENT_GAP, CONTENT_PADDING } from "@/config/uiLayout";
import {
  DASHBOARD_CARD_CONTROL_LAYER_Z_INDEX,
  DASHBOARD_CARD_HIT_LAYER_Z_INDEX,
} from "@/config/uiScale";

const RISK_BADGE_SHADOW = "0 10px 24px rgba(15, 23, 42, 0.08)";

interface DashboardCardProps {
  card: SavedDashboardCard;
  cardState: DashboardCardState;
  index: number;
  totalCount: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function DashboardCardRiskBadge({
  riskLevel,
  size = "lg",
}: {
  riskLevel: RiskLevel;
  size?: "md" | "lg" | "xl";
}) {
  const { t } = useTranslation();
  const longRiskLabels = createRiskLevelLabels((key) => t(key), "long");

  return (
    <Badge
      color={getRiskColor(riskLevel)}
      size={size}
      radius="xl"
      styles={{
        root: {
          color: getRiskBadgeForegroundColor(riskLevel),
          boxShadow: RISK_BADGE_SHADOW,
          flexShrink: 0,
        },
        label: {
          fontWeight: 700,
          letterSpacing: "0.06em",
        },
      }}
    >
      {longRiskLabels[riskLevel].toUpperCase()}
    </Badge>
  );
}

function DashboardCardStatusContent({
  cardState,
  isMobile,
}: {
  cardState: DashboardCardState;
  isMobile: boolean;
}) {
  const { t } = useTranslation();

  if (cardState.status === "ok") {
    if (isMobile) {
      return (
        <>
          <DashboardCardRiskBadge
            riskLevel={cardState.currentRiskLevel}
            size="lg"
          />
          <Text c="dimmed" fz="sm">
            {t("home.sections.forecast.maxRiskLabel")}{" "}
            <Text
              component="span"
              fw={600}
              c={getRiskColor(cardState.todayMaxRiskLevel)}
            >
              {t(
                getRiskLevelI18nKeys(cardState.todayMaxRiskLevel).levelKey,
              ).toUpperCase()}
            </Text>
          </Text>
        </>
      );
    }

    return (
      <>
        <DashboardCardRiskBadge riskLevel={cardState.currentRiskLevel} />
        <Text c="dimmed" fz="sm">
          {t("home.sections.forecast.maxRiskLabel")}{" "}
          <Text
            component="span"
            fw={600}
            c={getRiskColor(cardState.todayMaxRiskLevel)}
          >
            {t(
              getRiskLevelI18nKeys(cardState.todayMaxRiskLevel).levelKey,
            ).toUpperCase()}
          </Text>
        </Text>
      </>
    );
  }

  return (
    <Text c="dimmed" fz="sm">
      {cardState.status === "batch_error"
        ? t(toDashboardBatchErrorI18nKey(cardState.reason))
        : cardState.status === "location_error"
          ? t(toDashboardCardErrorI18nKey(cardState.errorCode))
          : t("dashboard.cardErrors.missingResult")}
    </Text>
  );
}

function DashboardCardHeader({
  homePath,
  title,
  locationSubtitle,
  shouldShowLocationSubtitle,
  openHomeAriaLabel,
  lineClamp,
  actions,
}: {
  homePath: string;
  title: string;
  locationSubtitle: string;
  shouldShowLocationSubtitle: boolean;
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
      {shouldShowLocationSubtitle ? (
        <Text c="dimmed" fz="sm" lineClamp={lineClamp}>
          {locationSubtitle}
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
 * Renders a saved dashboard card with current risk and today's max from batch data.
 */
export function DashboardCard({
  card,
  cardState,
  index,
  totalCount,
  onRemove,
  onMoveUp,
  onMoveDown,
}: DashboardCardProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobileViewport();
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
  const locationSubtitle = formatSavedDashboardCardSubtitle(card);
  const shouldShowLocationSubtitle =
    locationSubtitle.length > 0 && locationSubtitle !== card.name;
  const homePath = buildDashboardHomePath(card.sport, card.displayLabel);
  const openHomeAriaLabel = t("dashboard.cards.openHomeAriaLabel", {
    title: cardTitle,
  });

  if (cardState.status === "loading") {
    return <DashboardCardSkeleton isMobile={isMobile} />;
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
          minHeight: isMobile ? undefined : 160,
          cursor: "pointer",
        }}
      >
        <Stack gap={CONTENT_GAP} justify="space-between" h="100%">
          <DashboardCardHeader
            homePath={homePath}
            title={cardTitle}
            locationSubtitle={locationSubtitle}
            shouldShowLocationSubtitle={shouldShowLocationSubtitle}
            openHomeAriaLabel={openHomeAriaLabel}
            lineClamp={isMobile ? 1 : 2}
            actions={<DashboardCardActions {...cardActionsProps} />}
          />
          <DashboardCardStatusContent
            cardState={cardState}
            isMobile={isMobile}
          />
        </Stack>
        <DashboardCardHomeOverlay homePath={homePath} />
      </Paper>
    </Box>
  );
}

import {
  Box,
  Button,
  Combobox,
  Group,
  InputBase,
  Loader,
  Select,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/ui/SectionCard";
import { CONTENT_GAP } from "@/config/uiLayout";
import { isSportType, sports, type SportType } from "@/domain/sport";
import { useDashboardLocationAdd } from "@/hooks/useDashboardLocationAdd";
import { useDashboardStore } from "@/store/dashboardStore";

interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

const FIELD_LABEL_WIDTH = 72;

interface DashboardMainPanelProps {
  onAddError?: (
    reason: NonNullable<
      ReturnType<typeof useDashboardLocationAdd>["addErrorReason"]
    >,
  ) => void;
}

/**
 * Renders the dashboard add panel with Home-style filters and an explicit add action.
 */
export function DashboardMainPanel({ onAddError }: DashboardMainPanelProps) {
  const { t } = useTranslation();
  const locationCombobox = useCombobox();
  const draftSport = useDashboardStore((state) => state.draftSport);
  const setDraftSport = useDashboardStore((state) => state.setDraftSport);
  const cards = useDashboardStore((state) => state.cards);
  const {
    locationSearchInput,
    locationSuggestions,
    isSuggestLoading,
    isResolvingLocation,
    isShowingCommittedDraftLocation,
    canAddMoreCards,
    canSubmitAdd,
    addErrorReason,
    onLocationSearchInputChange,
    onLocationOptionSubmit,
    onAddCardClick,
  } = useDashboardLocationAdd();

  const sportOptions = useMemo<SelectOption<SportType>[]>(
    () =>
      sports.map((sportMeta) => ({
        value: sportMeta.type,
        label: t(sportMeta.labelKey),
      })),
    [t],
  );

  const shouldRenderLocationDropdown =
    !isShowingCommittedDraftLocation && locationSuggestions.length > 0;
  const locationRightSection =
    isSuggestLoading || isResolvingLocation ? (
      <Loader size={16} />
    ) : (
      <Combobox.Chevron size="md" />
    );
  const locationOptions = locationSuggestions.map((suggestion) => (
    <Combobox.Option value={suggestion.id} key={suggestion.id}>
      {suggestion.displayLabel}
    </Combobox.Option>
  ));

  useEffect(() => {
    if (addErrorReason) {
      onAddError?.(addErrorReason);
    }
  }, [addErrorReason, onAddError]);

  const closeLocationDropdown = () => {
    locationCombobox.closeDropdown();
    locationCombobox.resetSelectedOption();
  };

  const handleSportChange = (value: string | null) => {
    if (value !== null && isSportType(value)) {
      setDraftSport(value);
    }
  };

  return (
    <SectionCard
      title={t("dashboard.header.title")}
      subtitle={t("dashboard.header.description")}
    >
      <Stack gap={CONTENT_GAP}>
        <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
          <Text fw={600} w={FIELD_LABEL_WIDTH} ta="right">
            {t("home.sections.filters.locationLabel")}:
          </Text>
          <Box flex={1}>
            <Combobox
              store={locationCombobox}
              onOptionSubmit={(value) => {
                onLocationOptionSubmit(value);
                closeLocationDropdown();
              }}
              size="md"
            >
              <Combobox.Target targetType="input">
                <InputBase
                  __staticSelector="Select"
                  aria-label={t("home.sections.filters.locationLabel")}
                  size="md"
                  placeholder={t("home.sections.filters.locationPlaceholder")}
                  value={locationSearchInput}
                  onChange={(event) => {
                    onLocationSearchInputChange(event.currentTarget.value);
                    if (!isShowingCommittedDraftLocation) {
                      locationCombobox.openDropdown();
                    }
                  }}
                  onFocus={() => {
                    if (shouldRenderLocationDropdown) {
                      locationCombobox.openDropdown();
                    }
                  }}
                  onBlur={closeLocationDropdown}
                  rightSection={locationRightSection}
                  rightSectionPointerEvents="none"
                  autoComplete="off"
                  disabled={!canAddMoreCards || isResolvingLocation}
                />
              </Combobox.Target>

              {shouldRenderLocationDropdown ? (
                <Combobox.Dropdown>
                  <Combobox.Options>{locationOptions}</Combobox.Options>
                </Combobox.Dropdown>
              ) : null}
            </Combobox>
          </Box>
        </Group>

        <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
          <Text fw={600} w={FIELD_LABEL_WIDTH} ta="right">
            {t("home.sections.filters.sportLabel")}:
          </Text>
          <Box flex={1}>
            <Select
              aria-label={t("home.sections.filters.sportLabel")}
              size="md"
              data={sportOptions}
              value={draftSport}
              onChange={handleSportChange}
              searchable
              nothingFoundMessage={t("home.sections.filters.sportNotFound")}
              disabled={!canAddMoreCards || isResolvingLocation}
            />
          </Box>
        </Group>

        <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
          <Box w={FIELD_LABEL_WIDTH} visibleFrom="xs" />
          <Button
            flex={1}
            size="md"
            onClick={onAddCardClick}
            disabled={!canSubmitAdd}
            loading={isResolvingLocation}
          >
            {t("dashboard.addLocation.addButton")}
          </Button>
        </Group>

        {!canAddMoreCards ? (
          <Text c="dimmed" fz="sm">
            {t("dashboard.errors.max_reached")}
          </Text>
        ) : null}

        {cards.length === 0 ? (
          <Stack gap="xs">
            <Text fw={600}>{t("dashboard.emptyState.title")}</Text>
            <Text c="dimmed">{t("dashboard.emptyState.body")}</Text>
          </Stack>
        ) : null}
      </Stack>
    </SectionCard>
  );
}

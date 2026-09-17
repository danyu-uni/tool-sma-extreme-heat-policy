import {
  Box,
  Button,
  Chip,
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
import { MAX_DASHBOARD_CARDS } from "@/domain/dashboard";
import { isSportType, sports, type SportType } from "@/domain/sport";
import type { Weekday } from "@/domain/weeklyWindow";
import { useDashboardLocationAdd } from "@/hooks/useDashboardLocationAdd";
import { toIntlLocale } from "@/i18n/language";
import { formatMinutesOfDay, formatWeekday } from "@/lib/scheduleFormat";
import { useDashboardStore } from "@/store/dashboardStore";

interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

const FIELD_LABEL_WIDTH = 72;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;
const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

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
  const { t, i18n } = useTranslation();
  const locale = toIntlLocale(i18n.resolvedLanguage);
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
    draftWeekdays,
    draftStartMinutes,
    draftEndMinutes,
    onDraftWeekdaysChange,
    onDraftStartMinutesChange,
    onDraftEndMinutesChange,
    onLocationSearchInputChange,
    onLocationOptionSubmit,
    onAddCardClick,
  } = useDashboardLocationAdd();
  const isAddFormDisabled = !canAddMoreCards || isResolvingLocation;

  const sportOptions = useMemo<SelectOption<SportType>[]>(
    () =>
      sports.map((sportMeta) => ({
        value: sportMeta.type,
        label: t(sportMeta.labelKey),
      })),
    [t],
  );

  const weekdayOptions = useMemo(
    () =>
      WEEKDAYS.map((day) => ({
        value: String(day),
        label: formatWeekday(day, locale),
      })),
    [locale],
  );
  const startTimeOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => ({
        value: String(hour * MINUTES_PER_HOUR),
        label: formatMinutesOfDay(hour * MINUTES_PER_HOUR, locale),
      })),
    [locale],
  );
  const endTimeOptions = useMemo(
    () => [
      ...startTimeOptions.slice(1),
      {
        value: String(MINUTES_PER_DAY),
        label: t("dashboard.addLocation.midnight"),
      },
    ],
    [startTimeOptions, t],
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
      subtitle={t("dashboard.header.description", {
        maxCards: MAX_DASHBOARD_CARDS,
      })}
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
                  disabled={isAddFormDisabled}
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
              disabled={isAddFormDisabled}
            />
          </Box>
        </Group>

        <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
          <Text fw={600} w={FIELD_LABEL_WIDTH} ta="right">
            {t("dashboard.addLocation.weekdaysLabel")}:
          </Text>
          <Chip.Group
            multiple
            value={draftWeekdays.map(String)}
            onChange={(values) =>
              onDraftWeekdaysChange(
                values
                  .map((value) => Number(value) as Weekday)
                  .sort((left, right) => left - right),
              )
            }
          >
            <Group
              flex={1}
              gap="xs"
              role="group"
              aria-label={t("dashboard.addLocation.weekdaysLabel")}
            >
              {weekdayOptions.map((option) => (
                <Chip
                  key={option.value}
                  value={option.value}
                  size="sm"
                  disabled={isAddFormDisabled}
                >
                  {option.label}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Group>

        <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
          <Text fw={600} w={FIELD_LABEL_WIDTH} ta="right">
            {t("dashboard.addLocation.timeLabel")}:
          </Text>
          <Group flex={1} wrap="nowrap" gap="xs">
            <Select
              flex={1}
              aria-label={t("dashboard.addLocation.startTime")}
              placeholder={t("dashboard.addLocation.startTime")}
              size="md"
              data={startTimeOptions}
              value={
                draftStartMinutes === null ? null : String(draftStartMinutes)
              }
              onChange={(value) =>
                onDraftStartMinutesChange(value === null ? null : Number(value))
              }
              clearable
              disabled={isAddFormDisabled}
            />
            <Select
              flex={1}
              aria-label={t("dashboard.addLocation.endTime")}
              placeholder={t("dashboard.addLocation.endTime")}
              size="md"
              data={endTimeOptions}
              value={draftEndMinutes === null ? null : String(draftEndMinutes)}
              onChange={(value) =>
                onDraftEndMinutesChange(value === null ? null : Number(value))
              }
              clearable
              disabled={isAddFormDisabled}
            />
          </Group>
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
            {t("dashboard.errors.max_reached", {
              maxCards: MAX_DASHBOARD_CARDS,
            })}
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

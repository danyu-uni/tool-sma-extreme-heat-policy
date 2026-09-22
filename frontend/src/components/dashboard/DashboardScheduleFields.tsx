import { Chip, Group, Select, Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CONTENT_GAP } from "@/config/uiLayout";
import type { Weekday } from "@/domain/weeklyWindow";
import { toIntlLocale } from "@/i18n/language";
import { formatMinutesOfDay, formatWeekday } from "@/lib/scheduleFormat";

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;
const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

interface DashboardScheduleFieldsProps {
  weekdays: readonly Weekday[];
  startMinutes: number | null;
  endMinutes: number | null;
  onWeekdaysChange: (weekdays: readonly Weekday[]) => void;
  onStartMinutesChange: (minutes: number | null) => void;
  onEndMinutesChange: (minutes: number | null) => void;
  labelWidth: number;
  disabled?: boolean;
}

export function DashboardScheduleFields({
  weekdays,
  startMinutes,
  endMinutes,
  onWeekdaysChange,
  onStartMinutesChange,
  onEndMinutesChange,
  labelWidth,
  disabled = false,
}: DashboardScheduleFieldsProps) {
  const { t, i18n } = useTranslation();
  const locale = toIntlLocale(i18n.resolvedLanguage);

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

  return (
    <>
      <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
        <Text fw={600} w={labelWidth} ta="right">
          {t("dashboard.addLocation.weekdaysLabel")}:
        </Text>
        <Chip.Group
          multiple
          value={weekdays.map(String)}
          onChange={(values) =>
            onWeekdaysChange(
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
                disabled={disabled}
              >
                {option.label}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </Group>

      <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
        <Text fw={600} w={labelWidth} ta="right">
          {t("dashboard.addLocation.timeLabel")}:
        </Text>
        <Group flex={1} wrap="nowrap" gap="xs">
          <Select
            flex={1}
            aria-label={t("dashboard.addLocation.startTime")}
            placeholder={t("dashboard.addLocation.startTime")}
            size="md"
            data={startTimeOptions}
            value={startMinutes === null ? null : String(startMinutes)}
            onChange={(value) =>
              onStartMinutesChange(value === null ? null : Number(value))
            }
            clearable
            disabled={disabled}
          />
          <Select
            flex={1}
            aria-label={t("dashboard.addLocation.endTime")}
            placeholder={t("dashboard.addLocation.endTime")}
            size="md"
            data={endTimeOptions}
            value={endMinutes === null ? null : String(endMinutes)}
            onChange={(value) =>
              onEndMinutesChange(value === null ? null : Number(value))
            }
            clearable
            disabled={disabled}
          />
        </Group>
      </Group>
    </>
  );
}

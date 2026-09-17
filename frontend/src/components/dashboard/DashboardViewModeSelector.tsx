import { SegmentedControl, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  DASHBOARD_VIEW_MODES,
  isDashboardViewMode,
  type DashboardViewMode,
} from "@/domain/dashboardViewMode";

interface DashboardViewModeSelectorProps {
  value: DashboardViewMode;
  onChange: (value: DashboardViewMode) => void;
}

/**
 * Segmented control for switching dashboard card metrics between view modes.
 */
export function DashboardViewModeSelector({
  value,
  onChange,
}: DashboardViewModeSelectorProps) {
  const { t } = useTranslation();

  return (
    <Stack gap="xs">
      <SegmentedControl
        fullWidth
        value={value}
        onChange={(nextValue) => {
          if (isDashboardViewMode(nextValue)) {
            onChange(nextValue);
          }
        }}
        data={DASHBOARD_VIEW_MODES.map((mode) => ({
          value: mode,
          label: t(`dashboard.viewMode.options.${mode}`),
        }))}
        aria-label={t("dashboard.viewMode.label")}
      />
      {value !== "now" ? (
        <Text c="dimmed" fz="sm">
          {t("dashboard.viewMode.placeholderHint")}
        </Text>
      ) : null}
    </Stack>
  );
}

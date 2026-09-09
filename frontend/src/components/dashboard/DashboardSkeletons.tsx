import { Group, Paper, Skeleton, Stack } from "@mantine/core";
import { CONTENT_GAP, CONTENT_PADDING } from "@/config/uiLayout";

interface DashboardCardSkeletonProps {
  isMobile?: boolean;
}

/**
 * Renders a skeleton placeholder while a dashboard card's batch risk data loads.
 */
export function DashboardCardSkeleton({
  isMobile = false,
}: DashboardCardSkeletonProps) {
  return (
    <Paper
      withBorder
      radius="md"
      p={CONTENT_PADDING.base}
      style={{ minHeight: isMobile ? undefined : 160 }}
    >
      <Stack gap={CONTENT_GAP} justify="space-between" h="100%">
        <Stack gap={4}>
          <Group wrap="nowrap" align="center" gap="xs">
            <Stack gap={4} style={{ flex: 1 }}>
              <Skeleton h={20} w="75%" radius="sm" />
            </Stack>
            <Group gap={4} wrap="nowrap">
              <Skeleton h={26} w={26} radius="sm" />
              <Skeleton h={26} w={26} radius="sm" />
              <Skeleton h={26} w={26} radius="sm" />
            </Group>
          </Group>
          <Skeleton h={14} w="70%" radius="sm" />
        </Stack>
        <Skeleton h={32} w={112} radius="xl" />
        <Skeleton h={16} w="80%" radius="sm" />
      </Stack>
    </Paper>
  );
}

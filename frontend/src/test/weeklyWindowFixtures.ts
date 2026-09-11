import type { SavedDashboardCard } from "@/domain/dashboard";
import type { BatchHeatRiskLocationResult } from "@/api/heatRiskBatch";

export const sydneyCard: SavedDashboardCard = {
  id: "sydney",
  sport: "SOCCER",
  name: "Sydney",
  displayLabel: "Sydney, New South Wales, Australia",
  countryName: "Australia",
  latitude: -33.86,
  longitude: 151.21,
};

export function sydneyForecast(): BatchHeatRiskLocationResult {
  return {
    sport: sydneyCard.sport,
    latitude: sydneyCard.latitude,
    longitude: sydneyCard.longitude,
    timezone: "Australia/Sydney",
    status: "ok",
    error_code: null,
    detail: null,
    forecast: Array.from({ length: 25 }, (_, hour) => {
      const utc = Date.UTC(2026, 8, 14, 14 + hour);
      return {
        time_utc: new Date(utc).toISOString(),
        time_local: `${new Date(utc + 10 * 3_600_000).toISOString().slice(0, 19)}+10:00`,
        inputs: {
          air_temperature_c: 25,
          mean_radiant_temperature_c: 30,
          relative_humidity_pct: 50,
          wind_speed_10m_ms: 2,
          direct_normal_irradiance_wm2: 200,
        },
        heat_risk: {
          risk_level_interpolated: hour === 19 ? 3.2 : 1.2,
          t_medium: 30,
          t_high: 35,
          t_extreme: 40,
          recommendation: "",
        },
      };
    }),
  };
}

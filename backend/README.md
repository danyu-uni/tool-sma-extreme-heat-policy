# SMA Extreme Heat Backend

FastAPI backend for the SMA Extreme Heat Policy tool.

## Architecture At A Glance

- `src/sma_extreme_heat_backend/api/routes.py`
  HTTP route wiring only.
- `src/sma_extreme_heat_backend/schemas`
  Request and response contracts.
- `src/sma_extreme_heat_backend/services`
  Weather orchestration, MRT enrichment, caching, and forecast shaping.
- `src/sma_extreme_heat_backend/clients`
  Open-Meteo HTTP access and payload validation.
- `src/sma_extreme_heat_backend/calculators`
  pythermalcomfort adapter layer only.
- `src/sma_extreme_heat_backend/core`
  Settings and typed application errors.

This split is intentional: routes stay thin, IO stays isolated, and the risk
pipeline remains testable without HTTP or FastAPI.

## Requirements

- Python 3.12
- `uv`

## How to get started locally

### Setup

To complete the following action you need to have UV installed on your computer.

```bash
cd backend
uv sync
```

### Environment

Copy `backend/.env.example` to `backend/.env` using the command `cp .env.example .env`.
Set `CORS_ORIGINS` to the production frontend origin. If you need to allow
Netlify preview or branch deploy URLs, set `CORS_ORIGIN_REGEX` to a strict regex
such as `^https://([a-z0-9-]+--)?sports-heat-tool\.netlify\.app$`.
`HTTP_TIMEOUT_SECONDS` controls the per-attempt Open-Meteo request timeout and
defaults to `3` seconds.

### Run locally

```bash
uv run uvicorn sma_extreme_heat_backend.main:app --reload --port 8000
```

## Local Checks

```bash
uv run ruff check .
uv run pytest
```

## Cloud Build And Cloud Run Deployment

Backend deployment logic lives in `backend/cloudbuild.yaml`. Cloud Build
triggers should use that config file, not Dockerfile autodetection.

The Cloud Build pipeline first resolves and validates the required deployment
substitutions, then runs backend linting and tests before any image is built. If
those checks pass, it builds the image from `backend/Dockerfile`, pushes that
exact image to Artifact Registry, and deploys the same image digest to Cloud
Run.

This explicit config is preferred over Dockerfile autodetection because it keeps
the deployment steps reproducible, avoids hidden builder defaults, validates
required substitutions before deployment work begins, and makes the lint/test
gates part of the release path.

Trigger settings:

- Branches: `development` for dev/staging, `main` for production.
- Included files: `backend/**`.
- Config file path: `backend/cloudbuild.yaml`.
- Production triggers should require manual approval.

Required trigger substitutions:

- `_SERVICE_NAME`
- `_RUN_REGION`
- `_ARTIFACT_REGION`
- `_ARTIFACT_REPOSITORY`

Cloud Run owns runtime settings such as `CORS_ORIGINS` and
`CORS_ORIGIN_REGEX`.

## Pre-commit

The repository root contains `.pre-commit-config.yaml` with:

- Ruff format + check for `backend/**/*.py`
- Prettier write hook for `frontend/**`

After installing `pre-commit` locally, run:

```bash
pre-commit install
pre-commit run --all-files
```

## API

### `POST /home/risk`

Request body:

- `sport: string`
  Must exactly match a pythermalcomfort `Sports` enum name, for example `SOCCER`.
- `latitude: number`
  Range `[-90, 90]`.
- `longitude: number`
  Range `[-180, 180]`.
- `profile: string`
  Must be one of `ADULT`, `UNDER_10`, `AGE_10_13`, or `AGE_14_17`. All profiles
  currently use the same pythermalcomfort model path; the field is included to
  preserve the public contract for future profile-specific behaviour.

Example request:

```json
{
  "sport": "SOCCER",
  "latitude": -33.847,
  "longitude": 151.067,
  "profile": "AGE_10_13"
}
```

### Response contract

The API is forecast-centric:

- `forecast[0]` is the earliest complete forecast point used by the frontend gauge and recommendation sections.
- Later `forecast[]` entries drive the charts.
- There is no separate top-level `heat_risk` or `meta_data` block.

Example response:

```json
{
  "request": {
    "sport": "SOCCER",
    "profile": "AGE_10_13",
    "location": {
      "latitude": -33.847,
      "longitude": 151.067,
      "timezone": "Australia/Sydney"
    }
  },
  "forecast": [
    {
      "time_utc": "2026-03-09T00:00:00Z",
      "time_local": "2026-03-09T11:00:00+11:00",
      "inputs": {
        "air_temperature_c": 31.0,
        "mean_radiant_temperature_c": 37.25,
        "relative_humidity_pct": 62.0,
        "wind_speed_10m_ms": 1.5,
        "direct_normal_irradiance_wm2": 700.0
      },
      "heat_risk": {
        "risk_level_interpolated": 1.94,
        "t_medium": 34.5,
        "t_high": 37.1,
        "t_extreme": 39.2,
        "recommendation": "Increase hydration & modify clothing"
      }
    }
  ]
}
```

### `POST /home/risk/batch`

Dashboard batch endpoint for up to six location and sport pairs in one request.
Each location is calculated with the same forecast pipeline as `POST /home/risk`.

Request body:

- `profile: string`
  Must be one of `ADULT`, `UNDER_10`, `AGE_10_13`, or `AGE_14_17`.
- `locations: array`
  Required. Length `1` to `6`. Each item contains:
  - `sport: string`
    Must exactly match a pythermalcomfort `Sports` enum name, for example `SOCCER`.
  - `latitude: number`
    Range `[-90, 90]`.
  - `longitude: number`
    Range `[-180, 180]`.

Example request:

```json
{
  "profile": "ADULT",
  "locations": [
    {
      "sport": "SOCCER",
      "latitude": -33.847,
      "longitude": 151.067
    },
    {
      "sport": "CROQUET",
      "latitude": -37.813,
      "longitude": 144.963
    }
  ]
}
```

Batch response contract:

- Returns HTTP `200` when the request body is valid, even if one or more locations fail.
- `request.profile` echoes the submitted profile.
- Each `locations[]` entry includes the submitted `sport`, coordinates, resolved
  `timezone`, `status`, and either a `forecast[]` array or an error payload.
- `forecast[]` uses the same point shape as `POST /home/risk`, including a
  7-day hourly window.
- Card metrics such as current risk or today's max should be derived on the
  frontend from `forecast[]`.

Example success item:

```json
{
  "sport": "SOCCER",
  "latitude": -33.847,
  "longitude": 151.067,
  "timezone": "Australia/Sydney",
  "status": "ok",
  "forecast": [
    {
      "time_utc": "2026-03-09T00:00:00Z",
      "time_local": "2026-03-09T11:00:00+11:00",
      "inputs": {
        "air_temperature_c": 31.0,
        "mean_radiant_temperature_c": 37.25,
        "relative_humidity_pct": 62.0,
        "wind_speed_10m_ms": 1.5,
        "direct_normal_irradiance_wm2": 700.0
      },
      "heat_risk": {
        "risk_level_interpolated": 1.94,
        "t_medium": 34.5,
        "t_high": 37.1,
        "t_extreme": 39.2,
        "recommendation": "Increase hydration & modify clothing"
      }
    }
  ],
  "error_code": null,
  "detail": null
}
```

Example per-location error item:

```json
{
  "sport": "CROQUET",
  "latitude": -37.813,
  "longitude": 144.963,
  "timezone": "Australia/Melbourne",
  "status": "error",
  "forecast": null,
  "error_code": "weather_provider_unavailable",
  "detail": "Weather provider unavailable"
}
```

Batch-specific behaviour:

- Open-Meteo is called once per chunk of locations using comma-separated
  coordinates, with `forecast_days=7`.
- Missing required model inputs for a location map to
  `error_code: "unknown_inputs"` on that location instead of a top-level `422`.
- Successful location results are cached separately from `POST /home/risk`
  responses.

## Risk Flow

1. Fetch Open-Meteo hourly weather with:
   - `temperature_2m`
   - `relative_humidity_2m`
   - `wind_speed_10m`
   - `direct_normal_irradiance`
   - `timezone=<resolved IANA timezone>`
   - `wind_speed_unit=ms`
2. Validate provider units at runtime:
   - `temperature_2m: °C`
   - `relative_humidity_2m: %`
   - `wind_speed_10m: m/s`
   - `direct_normal_irradiance: W/m²`
3. Resolve the IANA timezone from `latitude` and `longitude`, then require the
   provider response to echo back the same timezone.
4. Keep hourly records where `time >= now_utc - 1h` inside the 7-day forecast window.
5. Convert the retained rows into the resolved local timezone.
6. Drop rows missing `tdb`.
7. Build MRT values with `pvlib` + `pythermalcomfort` on the provider-native hourly points:
   - compute solar elevation for each local timestamp
   - clamp negative solar elevations to `0`
   - derive `dni = direct_normal_irradiance * 0.75`
   - compute `delta_mrt` with `pythermalcomfort.models.solar_gain`
   - derive `tr = tdb + delta_mrt`
8. Convert `wind_speed_10m_ms` to the model's required 1.1 m wind speed using
   `pythermalcomfort.utils.scale_wind_speed_log(...)`.
9. Run `sports_heat_stress_risk` for each complete forecast row.
10. Skip incomplete rows and treat the earliest complete row as `forecast[0]`.
11. Return `422` only when no complete forecast row exists; the error payload is derived
    from the earliest candidate row.

## Caching

- The risk service keeps two in-memory TTL caches:
  - Home cache keyed by `sport + profile + latitude + longitude`
  - Batch cache keyed by `batch + sport + profile + latitude + longitude`
- Latitude and longitude are formatted to six decimal places in both cache keys.
  Coordinates that differ only beyond the sixth decimal share the same cache entry,
  matching `POST /home/risk` behaviour.
- Requests from different users will reuse cached results only when they hit the
  same backend process.
- The cache is not shared across multiple server instances.
- Batch requests do not populate the Home cache, and Home requests do not populate
  the batch cache.
- Failed batch locations are not cached; they are retried on the next request.

## Validation And Errors

- Invalid request bodies return `422`.
- Missing required inputs return `422` only when the backend cannot build any complete
  forecast point; in that case the error payload uses the earliest candidate row and includes:
  - `unknown_inputs`
  - `available_inputs`
- For `POST /home/risk/batch`, per-location failures return HTTP `200` with
  `status: "error"` and a stable `error_code` such as:
  - `weather_provider_unavailable`
  - `unknown_inputs`
  - `risk_calculation_failed`
- Upstream weather failures return `502` with:
  `{"detail": "Weather provider unavailable", "error_code": "weather_provider_unavailable"}`.
- Retryable Open-Meteo failures are retried once after `0.25` seconds; each
  attempt uses `HTTP_TIMEOUT_SECONDS`.
- Future forecast rows with missing inputs are skipped instead of failing the request.

## Notes

- Mean radiant temperature is not assumed to equal dry-bulb air temperature.
  The backend derives MRT through the solar-gain pipeline and returns the final
  `mean_radiant_temperature_c` in each forecast point.
- Each forecast point exposes both `time_utc` and `time_local`; `time_utc` is the
  canonical instant, while `time_local` is the location-local display time.

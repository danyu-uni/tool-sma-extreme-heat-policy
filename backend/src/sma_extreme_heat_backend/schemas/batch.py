from __future__ import annotations

from enum import StrEnum
from typing import ClassVar

from pydantic import BaseModel, Field, FiniteFloat, field_validator

from sma_extreme_heat_backend.schemas.home import (
    ALLOWED_SPORTS,
    ForecastPoint,
    RiskProfile,
)

BATCH_RISK_LOCATION_MAX = 6


class BatchRiskLocationRequest(BaseModel):
    """One location and sport pair in a batch heat-risk request."""

    sport: str = Field(min_length=1)
    latitude: FiniteFloat = Field(ge=-90, le=90)
    longitude: FiniteFloat = Field(ge=-180, le=180)

    _allowed_sports: ClassVar[set[str]] = set(ALLOWED_SPORTS)

    @field_validator("sport")
    @classmethod
    def validate_sport(cls, value: str) -> str:
        """Require the exact pythermalcomfort `Sports` enum member name."""

        if value not in cls._allowed_sports:
            raise ValueError("sport must use official pythermalcomfort Sports enum name")
        return value


class BatchRiskRequest(BaseModel):
    """Validated request payload for `/home/risk/batch`."""

    profile: RiskProfile
    locations: list[BatchRiskLocationRequest] = Field(
        min_length=1,
        max_length=BATCH_RISK_LOCATION_MAX,
    )


class BatchRiskRequestSummary(BaseModel):
    """Shared request context returned with a batch response."""

    profile: RiskProfile


class BatchRiskLocationStatus(StrEnum):
    """Per-location outcome for a batch heat-risk response."""

    OK = "ok"
    ERROR = "error"


class BatchRiskLocationResult(BaseModel):
    """Heat-risk forecast data for one batch location and sport pair."""

    sport: str = Field(min_length=1)
    latitude: FiniteFloat = Field(ge=-90, le=90)
    longitude: FiniteFloat = Field(ge=-180, le=180)
    timezone: str | None = None
    status: BatchRiskLocationStatus
    forecast: list[ForecastPoint] | None = None
    error_code: str | None = None
    detail: str | None = None


class BatchRiskResponse(BaseModel):
    """Batch forecast response for the dashboard view."""

    request: BatchRiskRequestSummary
    locations: list[BatchRiskLocationResult]

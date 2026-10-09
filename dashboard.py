from pydantic import BaseModel, Field
from typing import Literal


Severity = Literal["critical", "high", "medium", "low"]


class Metric(BaseModel):
    id: str
    label: str
    value: str
    delta: str
    tone: Literal["cyan", "amber", "red", "green", "purple"]


class ThreatAlert(BaseModel):
    id: str
    title: str
    source: str
    technique: str
    severity: Severity
    score: int = Field(ge=0, le=100)
    confidence: int = Field(ge=0, le=100)
    observed_at: str
    description: str
    status: Literal["active", "investigating", "contained"]
    asset: str


class Decoy(BaseModel):
    id: str
    name: str
    type: str
    status: Literal["healthy", "degraded", "rotating"]
    region: str
    interaction_count: int
    coverage: int = Field(ge=0, le=100)
    adaptive_level: str
    last_rotated: str


class Activity(BaseModel):
    id: str
    timestamp: str
    event: str
    actor: str
    source: str
    severity: Severity


class Policy(BaseModel):
    bait_ratio: int = Field(ge=0, le=100)
    decoy_density: int = Field(ge=0, le=100)
    auto_rotate: bool
    quarantine_threshold: int = Field(ge=0, le=100)
    updated_at: str


class DashboardSnapshot(BaseModel):
    model_version: str
    environment: str
    updated_at: str
    metrics: list[Metric]
    alerts: list[ThreatAlert]
    decoys: list[Decoy]
    activity: list[Activity]
    policy: Policy
    techniques: list[dict[str, str | int]]


class PolicyUpdate(BaseModel):
    bait_ratio: int = Field(ge=0, le=100)
    decoy_density: int = Field(ge=0, le=100)
    auto_rotate: bool
    quarantine_threshold: int = Field(ge=0, le=100)


class ActionRequest(BaseModel):
    action: Literal["quarantine", "rotate-decoys", "acknowledge"]
    alert_id: str | None = None


class ActionResponse(BaseModel):
    action: str
    status: str
    message: str
    updated_alert_id: str | None = None

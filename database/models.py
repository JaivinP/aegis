from datetime import datetime, timezone
from typing import Optional, Literal, List, Dict, Any
from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TemperatureRange(BaseModel):
    min: float
    max: float
    unit: Literal["C", "F"] = "C"


class HumidityRange(BaseModel):
    min: float
    max: float


class DegradationModel(BaseModel):
    safeThreshold: float = 20
    atRiskThreshold: float = 50
    compromisedThreshold: float = 75


class Location(BaseModel):
    lat: float
    lng: float


class ShipmentType(BaseModel):
    shipmentTypeId: str
    name: str
    category: Literal["pharmaceutical", "food", "biologic", "custom"]
    safeTempRange: TemperatureRange
    safeHumidityRange: Optional[HumidityRange] = None
    complianceFrameworks: List[str] = Field(default_factory=list)
    degradationModel: DegradationModel = Field(default_factory=DegradationModel)
    createdAt: datetime = Field(default_factory=utc_now)
    updatedAt: datetime = Field(default_factory=utc_now)


class Shipment(BaseModel):
    shipmentId: str
    shipmentTypeId: str
    productName: str
    origin: str
    destination: str
    status: Literal[
        "CREATED", "CONNECTING", "IN_TRANSIT", "COMPLETED", "ESCALATED"
    ] = "CREATED"
    currentPhase: Literal["select", "connect", "monitor", "report"] = "select"
    routeProgress: float = 0
    containerId: str
    currentLocation: Optional[Location] = None
    routeCheckpoints: List[str] = Field(default_factory=list)
    finalStatus: Optional[Literal["SAFE", "AT_RISK", "COMPROMISED"]] = None
    startedAt: Optional[datetime] = None
    endedAt: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=utc_now)
    updatedAt: datetime = Field(default_factory=utc_now)


class SensorValue(BaseModel):
    value: Any
    unit: Optional[str] = None
    status: Literal["NOMINAL", "WARNING", "CRITICAL"] = "NOMINAL"


class SensorReading(BaseModel):
    shipmentId: str
    containerId: str
    timestamp: datetime = Field(default_factory=utc_now)

    sensors: Dict[str, SensorValue]

    zScores: Optional[Dict[str, float]] = None
    location: Optional[Location] = None
    battery: Optional[float] = None

    createdAt: datetime = Field(default_factory=utc_now)


class Event(BaseModel):
    shipmentId: str
    containerId: Optional[str] = None
    timestamp: datetime = Field(default_factory=utc_now)
    type: Literal[
        "SHIPMENT_STARTED",
        "SENSOR_READING",
        "SHOCK_EVENT",
        "TEMP_ANOMALY",
        "HUMIDITY_ANOMALY",
        "SEAL_BREACH",
        "WATER_DETECTED",
        "AI_ANALYSIS",
        "ESCALATION",
        "SHIPMENT_COMPLETED",
    ]
    severity: Literal["INFO", "WARNING", "CRITICAL"] = "INFO"
    title: str
    description: str
    sensorSnapshot: Optional[Dict[str, Any]] = None
    hash: Optional[str] = None
    createdAt: datetime = Field(default_factory=utc_now)


class AIReport(BaseModel):
    shipmentId: str
    reportType: Literal["INCIDENT", "FINAL_DELIVERY", "ESCALATION"]
    generatedAt: datetime = Field(default_factory=utc_now)
    modelUsed: Optional[str] = None

    status: Literal["SAFE", "AT_RISK", "COMPROMISED"]
    classification: Literal[
        "NOMINAL", "ANOMALY", "NEGLIGENCE", "TAMPERING", "CRITICAL"
    ]
    summary: str

    productViabilityScore: float
    degradationRisk: float

    confidence: Dict[str, float]
    metrics: Dict[str, float]

    causalReconstruction: List[str] = Field(default_factory=list)
    recommendedAction: str
    rawNarrative: str

    createdAt: datetime = Field(default_factory=utc_now)


class EscalationDraft(BaseModel):
    shipmentId: str
    reportId: str
    type: Literal[
        "FDA_DEVIATION",
        "PHARMACY_NOTIFICATION",
        "INSURANCE_CLAIM",
        "QUARANTINE_RECOMMENDATION",
    ]
    status: Literal["DRAFT", "APPROVED", "SENT"] = "DRAFT"
    recipient: str
    subject: str
    body: str
    createdAt: datetime = Field(default_factory=utc_now)
    approvedAt: Optional[datetime] = None
    sentAt: Optional[datetime] = None

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ValidationIssueRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    record_id: str
    field_name: str
    severity: str
    issue_code: str
    message: str
    created_at: datetime


class ProductionRecordBase(BaseModel):
    date: str | None = None
    shift: str | None = None
    employee_no: str | None = None
    operation_code: str | None = None
    machine_no: str | None = None
    work_order_no: str | None = None
    quantity_produced: int | None = None
    time_taken_hours: float | None = None


class ProductionRecordUpdate(ProductionRecordBase):
    pass


class ProductionRecordRead(ProductionRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    upload_id: str
    serial_no: int | None = None
    quantity_per_hour: float | None = None
    review_status: str
    field_confidence_json: dict[str, float]
    field_notes_json: dict[str, str]
    issues: list[ValidationIssueRead] = []
    created_at: datetime
    updated_at: datetime


class UploadCreateResponse(BaseModel):
    upload_id: str
    file_name: str
    status: str


class UploadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    file_name: str
    file_type: str
    file_url: str
    processing_status: str
    total_rows_extracted: int
    total_validation_errors: int
    total_validation_warnings: int
    extraction_notes: str | None = None
    uploaded_at: datetime
    created_at: datetime
    updated_at: datetime


class UploadWithRecords(UploadRead):
    records: list[ProductionRecordRead]


class ProcessResponse(BaseModel):
    upload_id: str
    status: str
    records: list[ProductionRecordRead]


class AnalyticsSummary(BaseModel):
    total_uploads: int
    total_records: int
    approved_records: int
    records_needing_review: int
    validation_failures: int
    total_quantity_produced: int
    total_time_taken: float
    average_time_per_record: float
    average_quantity_per_hour: float
    shift_summary: list[dict[str, Any]]
    machine_summary: list[dict[str, Any]]
    issue_summary: list[dict[str, Any]]
    status_summary: list[dict[str, Any]]

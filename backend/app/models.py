from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def new_id() -> str:
    return str(uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Upload(Base):
    __tablename__ = "uploads"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    file_type: Mapped[str] = mapped_column(String, nullable=False)
    file_url: Mapped[str] = mapped_column(String, nullable=False)
    stored_path: Mapped[str] = mapped_column(String, nullable=False)
    processing_status: Mapped[str] = mapped_column(String, default="uploaded")
    total_rows_extracted: Mapped[int] = mapped_column(Integer, default=0)
    total_validation_errors: Mapped[int] = mapped_column(Integer, default=0)
    total_validation_warnings: Mapped[int] = mapped_column(Integer, default=0)
    extraction_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_extraction_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    records: Mapped[list["ProductionRecord"]] = relationship(
        back_populates="upload", cascade="all, delete-orphan"
    )


class ProductionRecord(Base):
    __tablename__ = "production_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    upload_id: Mapped[str] = mapped_column(ForeignKey("uploads.id"), nullable=False)
    serial_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    date: Mapped[str | None] = mapped_column(String, nullable=True)
    shift: Mapped[str | None] = mapped_column(String, nullable=True)
    employee_no: Mapped[str | None] = mapped_column(String, nullable=True)
    operation_code: Mapped[str | None] = mapped_column(String, nullable=True)
    machine_no: Mapped[str | None] = mapped_column(String, nullable=True)
    work_order_no: Mapped[str | None] = mapped_column(String, nullable=True)
    quantity_produced: Mapped[int | None] = mapped_column(Integer, nullable=True)
    time_taken_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    quantity_per_hour: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_status: Mapped[str] = mapped_column(String, default="needs_review")
    field_confidence_json: Mapped[dict] = mapped_column(JSON, default=dict)
    field_notes_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    upload: Mapped[Upload] = relationship(back_populates="records")
    issues: Mapped[list["ValidationIssue"]] = relationship(
        back_populates="record", cascade="all, delete-orphan"
    )


class ValidationIssue(Base):
    __tablename__ = "validation_issues"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    record_id: Mapped[str] = mapped_column(ForeignKey("production_records.id"), nullable=False)
    field_name: Mapped[str] = mapped_column(String, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)
    issue_code: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    record: Mapped[ProductionRecord] = relationship(back_populates="issues")

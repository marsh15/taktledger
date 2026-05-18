import os
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from .database import BASE_DIR, Base, engine, get_db
from .extraction import extract_document, fallback_extraction
from .models import ProductionRecord, Upload, ValidationIssue
from .schemas import (
    AnalyticsSummary,
    ProcessResponse,
    ProductionRecordRead,
    ProductionRecordUpdate,
    UploadCreateResponse,
    UploadRead,
    UploadWithRecords,
)
from .validation import apply_validation, upload_issue_counts

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_DIST_DIR = BASE_DIR.parent / "frontend" / "dist"
CORS_ORIGIN_REGEX = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"^(http://(localhost|127\.0\.0\.1):\d+|https://[a-zA-Z0-9-]+\.vercel\.app)$",
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TaktLedger API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024


def upload_with_records_query(db: Session):
    return db.query(Upload).options(
        selectinload(Upload.records).selectinload(ProductionRecord.issues)
    )


def records_with_issues_query(db: Session):
    return db.query(ProductionRecord).options(selectinload(ProductionRecord.issues))


def require_upload(db: Session, upload_id: str) -> Upload:
    upload = upload_with_records_query(db).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    return upload


def require_record(db: Session, record_id: str) -> ProductionRecord:
    record = records_with_issues_query(db).filter(ProductionRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


def refresh_upload_counts(db: Session, upload: Upload) -> None:
    records = records_with_issues_query(db).filter(ProductionRecord.upload_id == upload.id).all()
    errors, warnings = upload_issue_counts(records)
    upload.total_rows_extracted = len(records)
    upload.total_validation_errors = errors
    upload.total_validation_warnings = warnings


def extraction_value(row: dict[str, Any], key: str) -> Any:
    cell = row.get(key, {})
    return cell.get("value") if isinstance(cell, dict) else cell


def detected_file_type(content: bytes) -> str | None:
    if content.startswith(b"%PDF-"):
        return "pdf"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if content.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    return None


def extraction_confidences(row: dict[str, Any]) -> dict[str, float]:
    values: dict[str, float] = {}
    for key, cell in row.items():
        if isinstance(cell, dict):
            values[key] = float(cell.get("confidence") or 0)
    return values


def extraction_notes(row: dict[str, Any]) -> dict[str, str]:
    values: dict[str, str] = {}
    for key, cell in row.items():
        if isinstance(cell, dict) and cell.get("notes"):
            values[key] = str(cell["notes"])
    return values


def extraction_rows(extraction: dict[str, Any]) -> list[dict[str, Any]]:
    rows = extraction.get("rows", [])
    return rows if isinstance(rows, list) else []


def ensure_rows(extraction: dict[str, Any]) -> dict[str, Any]:
    if extraction_rows(extraction):
        return extraction

    fallback = fallback_extraction()
    fallback["extraction_notes"] = (
        f"{fallback['extraction_notes']} Processing recovered because extraction returned no rows."
    )
    return fallback


def record_issue_counts(record: ProductionRecord) -> tuple[int, int]:
    errors = sum(1 for item in record.issues if item.severity == "error")
    warnings = sum(1 for item in record.issues if item.severity == "warning")
    return errors, warnings


def record_response(record: ProductionRecord) -> ProductionRecordRead:
    return ProductionRecordRead.model_validate(record)


def record_responses(records: list[ProductionRecord]) -> list[dict[str, Any]]:
    return [record_response(record).model_dump(mode="json") for record in records]


@app.get("/api/health")
def health():
    return {"status": "ok", "product": "TaktLedger"}


@app.post("/api/uploads", response_model=UploadCreateResponse)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use jpg, jpeg, png, or pdf.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum 10 MB.")

    actual_type = detected_file_type(content)
    expected_types = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "pdf": "pdf"}
    expected_type = expected_types[extension.removeprefix(".")]
    if actual_type != expected_type:
        raise HTTPException(status_code=400, detail="File contents do not match the selected file type.")

    stored_name = f"{uuid4()}{extension}"
    stored_path = UPLOAD_DIR / stored_name
    stored_path.write_bytes(content)

    upload = Upload(
        file_name=file.filename or stored_name,
        file_type=extension.removeprefix("."),
        file_url=f"/uploads/{stored_name}",
        stored_path=str(stored_path),
        processing_status="uploaded",
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)
    return UploadCreateResponse(upload_id=upload.id, file_name=upload.file_name, status=upload.processing_status)


@app.post("/api/uploads/{upload_id}/process", response_model=ProcessResponse)
def process_upload(upload_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    upload = require_upload(db, upload_id)
    upload.processing_status = "processing"
    record_ids = [record.id for record in upload.records]
    if record_ids:
        db.query(ValidationIssue).filter(ValidationIssue.record_id.in_(record_ids)).delete(
            synchronize_session=False
        )
    db.query(ProductionRecord).filter(ProductionRecord.upload_id == upload.id).delete(
        synchronize_session=False
    )
    db.commit()
    db.refresh(upload)

    extraction = ensure_rows(extract_document(upload.stored_path, upload.file_type))
    upload.raw_extraction_json = extraction
    upload.extraction_notes = extraction.get("extraction_notes")

    for index, row in enumerate(extraction_rows(extraction), start=1):
        record = ProductionRecord(
            upload_id=upload.id,
            serial_no=extraction_value(row, "serial_no") or index,
            date=extraction_value(row, "date"),
            shift=extraction_value(row, "shift"),
            employee_no=extraction_value(row, "employee_no"),
            operation_code=extraction_value(row, "operation_code"),
            machine_no=extraction_value(row, "machine_no"),
            work_order_no=extraction_value(row, "work_order_no"),
            quantity_produced=extraction_value(row, "quantity_produced"),
            time_taken_hours=extraction_value(row, "time_taken_hours"),
            field_confidence_json=extraction_confidences(row),
            field_notes_json=extraction_notes(row),
        )
        db.add(record)
    db.flush()

    records = records_with_issues_query(db).filter(ProductionRecord.upload_id == upload.id).all()
    for record in records:
        apply_validation(db, record)

    upload.processing_status = "extracted"
    refresh_upload_counts(db, upload)
    db.commit()

    upload = require_upload(db, upload_id)
    return {
        "upload_id": upload.id,
        "status": upload.processing_status,
        "records": record_responses(upload.records),
    }


@app.get("/api/uploads", response_model=list[UploadRead])
def list_uploads(db: Session = Depends(get_db)):
    return db.query(Upload).order_by(Upload.uploaded_at.desc()).all()


@app.get("/api/uploads/{upload_id}", response_model=UploadWithRecords)
def get_upload(upload_id: str, db: Session = Depends(get_db)):
    return require_upload(db, upload_id)


@app.get("/api/uploads/{upload_id}/records", response_model=list[ProductionRecordRead])
def get_upload_records(upload_id: str, db: Session = Depends(get_db)):
    upload = require_upload(db, upload_id)
    return upload.records


@app.patch("/api/records/{record_id}", response_model=ProductionRecordRead)
def update_record(record_id: str, payload: ProductionRecordUpdate, db: Session = Depends(get_db)):
    record = require_record(db, record_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    apply_validation(db, record)
    refresh_upload_counts(db, record.upload)
    db.commit()
    return require_record(db, record_id)


@app.post("/api/records/{record_id}/validate", response_model=ProductionRecordRead)
def validate_record(record_id: str, db: Session = Depends(get_db)):
    record = require_record(db, record_id)
    apply_validation(db, record)
    refresh_upload_counts(db, record.upload)
    db.commit()
    return require_record(db, record_id)


@app.post("/api/uploads/{upload_id}/approve", response_model=UploadWithRecords)
def approve_upload(upload_id: str, db: Session = Depends(get_db)):
    upload = require_upload(db, upload_id)
    for record in upload.records:
        apply_validation(db, record)
    db.flush()
    blockers = [
        record for record in upload.records if any(item.severity == "error" for item in record.issues)
    ]
    if blockers:
        refresh_upload_counts(db, upload)
        upload.processing_status = "needs_review"
        db.commit()
        raise HTTPException(status_code=409, detail="Records with validation errors cannot be approved.")

    for record in upload.records:
        record.review_status = "saved"
    upload.processing_status = "reviewed"
    refresh_upload_counts(db, upload)
    db.commit()
    return require_upload(db, upload_id)


@app.get("/api/records", response_model=list[ProductionRecordRead])
def list_records(
    search: str | None = None,
    shift: str | None = None,
    machine_no: str | None = None,
    employee_no: str | None = None,
    work_order_no: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(ProductionRecord).options(selectinload(ProductionRecord.issues))
    if shift:
        query = query.filter(ProductionRecord.shift == shift)
    if machine_no:
        query = query.filter(ProductionRecord.machine_no.ilike(f"%{machine_no}%"))
    if employee_no:
        query = query.filter(ProductionRecord.employee_no.ilike(f"%{employee_no}%"))
    if work_order_no:
        query = query.filter(ProductionRecord.work_order_no.ilike(f"%{work_order_no}%"))
    if status:
        if status == "valid":
            query = query.filter(ProductionRecord.review_status.in_(["approved", "saved"]))
        elif status == "error":
            query = query.filter(ProductionRecord.review_status == "validation_failed")
        else:
            query = query.filter(ProductionRecord.review_status == status)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                ProductionRecord.employee_no.ilike(like),
                ProductionRecord.machine_no.ilike(like),
                ProductionRecord.work_order_no.ilike(like),
                ProductionRecord.operation_code.ilike(like),
            )
        )
    return query.order_by(ProductionRecord.created_at.desc()).all()


@app.get("/api/analytics/summary", response_model=AnalyticsSummary)
def analytics_summary(db: Session = Depends(get_db)):
    records = records_with_issues_query(db).all()
    total_quantity = sum(record.quantity_produced or 0 for record in records)
    total_time = round(sum(record.time_taken_hours or 0 for record in records), 2)
    approved = sum(1 for record in records if record.review_status in {"approved", "saved"})
    needing_review = sum(1 for record in records if record.review_status == "needs_review")
    validation_failures = sum(1 for record in records if record.review_status == "validation_failed")

    def grouped(field_name: str) -> list[dict[str, Any]]:
        groups: dict[str, dict[str, Any]] = {}
        for record in records:
            key = getattr(record, field_name) or "Unknown"
            group = groups.setdefault(
                key,
                {
                    "name": key,
                    "records": 0,
                    "quantity": 0,
                    "hours": 0.0,
                    "validation_issue_count": 0,
                },
            )
            group["records"] += 1
            group["quantity"] += record.quantity_produced or 0
            group["hours"] += record.time_taken_hours or 0
            errors, warnings = record_issue_counts(record)
            group["validation_issue_count"] += errors + warnings
        for group in groups.values():
            group["hours"] = round(group["hours"], 2)
            group["average_quantity_per_hour"] = (
                round(group["quantity"] / group["hours"], 2) if group["hours"] else 0
            )
        return list(groups.values())

    issues = db.query(
        ValidationIssue.issue_code,
        ValidationIssue.severity,
        func.count(ValidationIssue.id).label("count"),
    ).group_by(ValidationIssue.issue_code, ValidationIssue.severity).all()
    statuses = db.query(
        ProductionRecord.review_status,
        func.count(ProductionRecord.id).label("count"),
    ).group_by(ProductionRecord.review_status).all()

    return AnalyticsSummary(
        total_uploads=db.query(func.count(Upload.id)).scalar() or 0,
        total_records=len(records),
        approved_records=approved,
        records_needing_review=needing_review,
        validation_failures=validation_failures,
        total_quantity_produced=total_quantity,
        total_time_taken=total_time,
        average_time_per_record=round(total_time / len(records), 2) if records else 0,
        average_quantity_per_hour=round(total_quantity / total_time, 2) if total_time else 0,
        shift_summary=grouped("shift"),
        machine_summary=grouped("machine_no"),
        issue_summary=[{"issue_code": code, "severity": severity, "count": count} for code, severity, count in issues],
        status_summary=[{"status": status, "count": count} for status, count in statuses],
    )


if FRONTEND_DIST_DIR.exists():
    frontend_assets_dir = FRONTEND_DIST_DIR / "assets"
    if frontend_assets_dir.exists():
        app.mount(
            "/assets",
            StaticFiles(directory=frontend_assets_dir),
            name="frontend-assets",
        )

    @app.get("/", include_in_schema=False)
    @app.get("/{path:path}", include_in_schema=False)
    def serve_frontend(path: str = ""):
        if path.startswith(("api/", "uploads/")):
            raise HTTPException(status_code=404, detail="Not Found")
        requested_path = FRONTEND_DIST_DIR / path
        if path and requested_path.is_file():
            return FileResponse(requested_path)
        return FileResponse(FRONTEND_DIST_DIR / "index.html")

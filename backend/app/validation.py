from __future__ import annotations

import re
from datetime import date
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from .models import ProductionRecord, ValidationIssue

FIELD_NAMES = [
    "date",
    "shift",
    "employee_no",
    "operation_code",
    "machine_no",
    "work_order_no",
    "quantity_produced",
    "time_taken_hours",
]


def is_blank(value: Any) -> bool:
    return value is None or str(value).strip() in {"", "-"}


def clean_text(value: Any) -> str | None:
    if is_blank(value):
        return None
    return str(value).strip()


def normalize_date(value: Any) -> tuple[str | None, str | None]:
    raw = clean_text(value)
    if raw is None:
        return None, "Field is required and must be reviewed manually."

    if re.fullmatch(r"\d{4}-\d{1,2}-\d{1,2}", raw):
        year, month, day = [int(part) for part in raw.split("-")]
    else:
        parts = re.split(r"[/-]", raw)
        if len(parts) == 2:
            day, month = [int(part) for part in parts]
            year = date.today().year
        elif len(parts) == 3:
            day, month, year = [int(part) for part in parts]
            if year < 100:
                year += 2000
        else:
            return raw, "Date should be a valid date."

    try:
        return date(year, month, day).isoformat(), None
    except ValueError:
        return raw, "Date should be a valid date."


def normalize_shift(value: Any) -> tuple[str | None, str | None]:
    raw = clean_text(value)
    if raw is None:
        return None, "Field is required and must be reviewed manually."
    normalized = raw.upper()
    shift_map = {"1": "I", "2": "II", "3": "III", "I": "I", "II": "II", "III": "III"}
    if normalized not in shift_map:
        return normalized, "Shift must be I, II, III, 1, 2, or 3."
    return shift_map[normalized], None


def parse_int(value: Any) -> tuple[int | None, str | None]:
    if is_blank(value):
        return None, None
    try:
        if isinstance(value, float) and not value.is_integer():
            return None, "Quantity should be a whole number."
        return int(str(value).strip()), None
    except ValueError:
        return None, "Quantity should be a whole number."


def parse_float(value: Any) -> tuple[float | None, str | None]:
    if is_blank(value):
        return None, "Field is required and must be reviewed manually."
    try:
        return float(str(value).strip()), None
    except ValueError:
        return None, "Time taken should be a valid number of hours."


def issue(field_name: str, severity: str, issue_code: str, message: str) -> ValidationIssue:
    return ValidationIssue(
        field_name=field_name,
        severity=severity,
        issue_code=issue_code,
        message=message,
    )


def apply_validation(db: Session, record: ProductionRecord) -> ProductionRecord:
    record.issues.clear()
    issues: list[ValidationIssue] = []

    normalized_date, date_error = normalize_date(record.date)
    record.date = normalized_date
    if date_error:
        issues.append(issue("date", "error", "INVALID_DATE", date_error))

    normalized_shift, shift_error = normalize_shift(record.shift)
    record.shift = normalized_shift
    if shift_error:
        issues.append(issue("shift", "error", "INVALID_SHIFT", shift_error))

    employee_no = clean_text(record.employee_no)
    if employee_no:
        employee_no = employee_no.replace(" ", "").upper()
    record.employee_no = employee_no
    if not employee_no:
        issues.append(issue("employee_no", "error", "MISSING_REQUIRED_FIELD", "Field is required and must be reviewed manually."))
    elif not re.fullmatch(r"BT\d{4}", employee_no):
        issues.append(issue("employee_no", "error", "INVALID_EMPLOYEE_FORMAT", "Employee number format may be invalid. Expected BT followed by 4 digits."))

    operation_code = clean_text(record.operation_code)
    record.operation_code = operation_code
    if not operation_code:
        issues.append(issue("operation_code", "error", "MISSING_REQUIRED_FIELD", "Field is required and must be reviewed manually."))
    elif not re.fullmatch(r"\d{5,6}", operation_code):
        issues.append(issue("operation_code", "error", "INVALID_OPERATION_CODE", "Operation code should be a 5 to 6 digit number."))

    machine_no = clean_text(record.machine_no)
    if machine_no:
        machine_no = machine_no.upper().replace(" ", "")
    record.machine_no = machine_no
    if not machine_no:
        issues.append(issue("machine_no", "error", "MISSING_REQUIRED_FIELD", "Field is required and must be reviewed manually."))
    elif machine_no.startswith("MC-") and not re.fullmatch(r"MC-\d{3}", machine_no):
        issues.append(issue("machine_no", "error", "INVALID_MACHINE_FORMAT", "Machine number should match MC-###."))
    elif not re.fullmatch(r"MC-\d{3}", machine_no):
        issues.append(issue("machine_no", "warning", "INVALID_MACHINE_FORMAT", "Machine number does not match common MC-### format. Please verify."))

    work_order_no = clean_text(record.work_order_no)
    record.work_order_no = work_order_no
    if not work_order_no:
        issues.append(issue("work_order_no", "error", "MISSING_REQUIRED_FIELD", "Field is required and must be reviewed manually."))
    elif not re.fullmatch(r"\d{5,10}", work_order_no):
        issues.append(issue("work_order_no", "error", "INVALID_WORK_ORDER", "Work order number should be a 5 to 10 digit number."))
    else:
        same_upload_count = db.query(func.count(ProductionRecord.id)).filter(
            ProductionRecord.upload_id == record.upload_id,
            ProductionRecord.work_order_no == work_order_no,
            ProductionRecord.id != record.id,
        ).scalar()
        saved_count = db.query(func.count(ProductionRecord.id)).filter(
            ProductionRecord.work_order_no == work_order_no,
            ProductionRecord.id != record.id,
            ProductionRecord.review_status.in_(["approved", "saved"]),
        ).scalar()
        if same_upload_count or saved_count:
            issues.append(issue("work_order_no", "warning", "DUPLICATE_WORK_ORDER", "This work order number appears more than once. Please verify whether this is expected."))

    quantity, quantity_error = parse_int(record.quantity_produced)
    record.quantity_produced = quantity
    if quantity_error:
        issues.append(issue("quantity_produced", "warning", "SUSPICIOUS_QUANTITY", quantity_error))
    elif quantity is None:
        issues.append(issue("quantity_produced", "warning", "MISSING_QUANTITY", "Quantity is missing or suspicious. Please verify manually."))
    elif quantity < 0:
        issues.append(issue("quantity_produced", "error", "INVALID_QUANTITY", "Quantity cannot be negative."))
    elif quantity > 500:
        issues.append(issue("quantity_produced", "warning", "SUSPICIOUS_QUANTITY", "Quantity is missing or suspicious. Please verify manually."))

    time_taken, time_error = parse_float(record.time_taken_hours)
    record.time_taken_hours = time_taken
    if time_error:
        issues.append(issue("time_taken_hours", "error", "SUSPICIOUS_TIME_VALUE", time_error))
    elif time_taken is None or time_taken <= 0 or time_taken > 24:
        issues.append(issue("time_taken_hours", "error", "SUSPICIOUS_TIME_VALUE", "Time taken should be a valid number of hours."))

    if record.quantity_produced is not None and record.time_taken_hours:
        record.quantity_per_hour = round(record.quantity_produced / record.time_taken_hours, 2)
        if record.quantity_per_hour < 0.05 or record.quantity_per_hour > 250:
            issues.append(issue("quantity_produced", "warning", "SUSPICIOUS_PRODUCTIVITY", "Quantity per hour looks unusual. Please verify production output."))
    else:
        record.quantity_per_hour = None
        if record.quantity_produced is None and record.time_taken_hours:
            issues.append(issue("quantity_produced", "warning", "MISSING_QUANTITY", "Quantity is missing but time taken is recorded. Please verify production output."))

    for field_name, confidence in (record.field_confidence_json or {}).items():
        if field_name in FIELD_NAMES and confidence < 0.6:
            issues.append(issue(field_name, "warning", "LOW_CONFIDENCE_FIELD", "AI confidence is low. Manual review is required."))
        elif field_name in FIELD_NAMES and confidence < 0.85:
            issues.append(issue(field_name, "info", "MEDIUM_CONFIDENCE_FIELD", "AI confidence is medium. Please verify if needed."))

    has_error = any(item.severity == "error" for item in issues)
    has_warning = any(item.severity == "warning" for item in issues)
    if has_error:
        record.review_status = "validation_failed"
    elif has_warning:
        record.review_status = "needs_review"
    elif record.review_status not in {"approved", "saved"}:
        record.review_status = "approved"

    record.issues.extend(issues)
    return record


def upload_issue_counts(records: list[ProductionRecord]) -> tuple[int, int]:
    errors = 0
    warnings = 0
    for record in records:
        for item in record.issues:
            if item.severity == "error":
                errors += 1
            elif item.severity == "warning":
                warnings += 1
    return errors, warnings

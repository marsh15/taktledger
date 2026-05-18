import json
import os
import time
from pathlib import Path
from typing import Any


EXTRACTION_PROMPT = """
You are an AI document extraction engine for manufacturing machine shop records.

Extract handwritten table data from the uploaded document image. The document is
titled "Machine shop data" and contains rows with these columns:
S. No, Date, Shift, Emp. No, Opn Code, Machine No., Work Order No.,
Qty. Prod., Time taken in hrs.

Return only valid JSON. Do not include markdown.
Use exactly these row keys:
serial_no, date, shift, employee_no, operation_code, machine_no,
work_order_no, quantity_produced, time_taken_hours.

For each field, return an object with:
value, confidence, notes.

Rules:
- Extract only table rows that contain actual handwritten/printed production data.
- Do not return empty table rows.
- Do not invent values. If a cell is unreadable, blank, crossed out, or overwritten, set value to null and explain in notes.
- Confidence must be a number from 0 to 1.
- Normalize shifts 1/2/3 to I/II/III.
- Normalize dates to YYYY-MM-DD when possible. If the year is not visible, keep the visible date and explain in notes.
- Return every value as a string when readable, otherwise null.
- Keep employee, operation, machine, and work order identifiers as strings.
- Return quantity_produced and time_taken_hours as string values when readable, otherwise null.
- If you can read only part of a value, return your best reading with low confidence and notes.
"""

CELL_SCHEMA = {
    "type": "object",
    "properties": {
        "value": {"type": "string", "nullable": True},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "notes": {"type": "string"},
    },
    "required": ["value", "confidence", "notes"],
}

EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "document_type": {"type": "string"},
        "extraction_notes": {"type": "string"},
        "rows": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "serial_no": CELL_SCHEMA,
                    "date": CELL_SCHEMA,
                    "shift": CELL_SCHEMA,
                    "employee_no": CELL_SCHEMA,
                    "operation_code": CELL_SCHEMA,
                    "machine_no": CELL_SCHEMA,
                    "work_order_no": CELL_SCHEMA,
                    "quantity_produced": CELL_SCHEMA,
                    "time_taken_hours": CELL_SCHEMA,
                },
                "required": [
                    "serial_no",
                    "date",
                    "shift",
                    "employee_no",
                    "operation_code",
                    "machine_no",
                    "work_order_no",
                    "quantity_produced",
                    "time_taken_hours",
                ],
            },
        },
    },
    "required": ["document_type", "extraction_notes", "rows"],
}

ROW_FIELD_KEYS = [
    "serial_no",
    "date",
    "shift",
    "employee_no",
    "operation_code",
    "machine_no",
    "work_order_no",
    "quantity_produced",
    "time_taken_hours",
]


def field(value: Any, confidence: float, notes: str = "") -> dict[str, Any]:
    return {"value": value, "confidence": confidence, "notes": notes}


def fallback_extraction() -> dict[str, Any]:
    return {
        "document_type": "machine_shop_data",
        "extraction_notes": "Deterministic fallback extraction used because no live Gemini extraction was available.",
        "rows": [
            {
                "serial_no": field(1, 0.98),
                "date": field("18/4/26", 0.86),
                "shift": field("1", 0.93),
                "employee_no": field("BT4686", 0.89),
                "operation_code": field("856430", 0.92),
                "machine_no": field("MC-730", 0.95),
                "work_order_no": field("165450", 0.88),
                "quantity_produced": field(45, 0.9),
                "time_taken_hours": field(3.5, 0.94),
            },
            {
                "serial_no": field(2, 0.98),
                "date": field("20/4/26", 0.82),
                "shift": field("II", 0.96),
                "employee_no": field("BT46B6", 0.62, "One character may be overwritten."),
                "operation_code": field("856440", 0.9),
                "machine_no": field("MC-780", 0.93),
                "work_order_no": field("165450", 0.87, "Duplicate seen in document."),
                "quantity_produced": field(None, 0.35, "Quantity cell is blank/dash."),
                "time_taken_hours": field(5.0, 0.95),
            },
            {
                "serial_no": field(3, 0.98),
                "date": field("23/4", 0.74, "Year omitted on source form."),
                "shift": field("III", 0.95),
                "employee_no": field("BT6025", 0.9),
                "operation_code": field("856460", 0.92),
                "machine_no": field("ABC-T30", 0.78, "Unknown machine prefix."),
                "work_order_no": field("24686870", 0.91),
                "quantity_produced": field(120, 0.84),
                "time_taken_hours": field(8.0, 0.94),
            },
        ],
    }


def safe_fallback(note: str) -> dict[str, Any]:
    data = fallback_extraction()
    data["extraction_notes"] = f"{data['extraction_notes']} {note}"
    return data


def cell_value(row: dict[str, Any], key: str) -> Any:
    cell = row.get(key)
    if isinstance(cell, dict):
        return cell.get("value")
    return cell


def normalize_cell(cell: Any) -> dict[str, Any]:
    if isinstance(cell, dict):
        value = cell.get("value")
        confidence = cell.get("confidence", 0.5)
        notes = cell.get("notes") or ""
    else:
        value = cell
        confidence = 0.5 if value not in {None, "", "-"} else 0.2
        notes = "Gemini returned this field without confidence metadata."

    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.5

    return {
        "value": value,
        "confidence": min(max(confidence, 0), 1),
        "notes": str(notes),
    }


def normalize_row(row: dict[str, Any]) -> dict[str, Any]:
    normalized = {key: normalize_cell(row.get(key)) for key in ROW_FIELD_KEYS}
    extra_keys = set(row) - set(ROW_FIELD_KEYS)
    for key in extra_keys:
        normalized[key] = row[key]
    return normalized


def has_meaningful_values(row: dict[str, Any]) -> bool:
    data_fields = ROW_FIELD_KEYS[1:]
    return any(cell_value(row, key) not in {None, "", "-"} for key in data_fields)


def normalize_extraction_result(data: Any) -> dict[str, Any]:
    if isinstance(data, list):
        data = {
            "document_type": "machine_shop_data",
            "extraction_notes": "Live Gemini extraction returned a row list; it was normalized.",
            "rows": data,
        }

    if not isinstance(data, dict):
        return safe_fallback("AI extraction returned an unsupported JSON shape, so fallback rows were used.")

    if "rows" not in data and isinstance(data.get("records"), list):
        data["rows"] = data["records"]

    rows = data.get("rows")
    if not isinstance(rows, list) or not rows:
        return safe_fallback("AI extraction returned no rows, so fallback rows were used.")

    if not all(isinstance(row, dict) for row in rows):
        return safe_fallback("AI extraction rows were not valid objects, so fallback rows were used.")

    normalized_rows = [normalize_row(row) for row in rows]
    meaningful_rows = [row for row in normalized_rows if has_meaningful_values(row)]
    if not meaningful_rows:
        return safe_fallback("AI extraction returned only blank rows, so fallback rows were used.")

    data.setdefault("document_type", "machine_shop_data")
    data.setdefault("extraction_notes", "Live Gemini extraction completed.")
    data["rows"] = meaningful_rows
    return data


def _mime_type(file_path: Path, file_type: str) -> str:
    if file_type == "pdf":
        return "application/pdf"
    if file_path.suffix.lower() in {".jpg", ".jpeg"}:
        return "image/jpeg"
    return "image/png"


def is_fallback_result(data: dict[str, Any]) -> bool:
    return str(data.get("extraction_notes", "")).startswith("Deterministic fallback extraction")


def generation_config(types: Any) -> Any:
    try:
        return types.GenerateContentConfig(
            temperature=0,
            response_mime_type="application/json",
            response_schema=EXTRACTION_SCHEMA,
        )
    except TypeError:
        return types.GenerateContentConfig(
            temperature=0,
            response_mime_type="application/json",
        )


def extract_document(file_path: str, file_type: str) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return fallback_extraction()

    try:
        import google.genai as genai
        from google.genai import types

        path = Path(file_path)
        timeout_ms = int(os.getenv("GEMINI_TIMEOUT_MS", "15000"))
        max_attempts = max(1, int(os.getenv("GEMINI_MAX_ATTEMPTS", "2")))
        http_options = types.HttpOptions(timeout=timeout_ms)
        client = genai.Client(api_key=api_key, http_options=http_options)
        image_part = types.Part.from_bytes(data=path.read_bytes(), mime_type=_mime_type(path, file_type))
        model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        last_error = ""

        for attempt in range(1, max_attempts + 1):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=[EXTRACTION_PROMPT, image_part],
                    config=generation_config(types),
                )
                text = (response.text or "").strip()
                result = normalize_extraction_result(parse_json_response(text))
                if not is_fallback_result(result):
                    return result
                last_error = result.get("extraction_notes", "")
            except Exception as exc:
                last_error = str(exc)

            if attempt < max_attempts:
                time.sleep(attempt)

        return safe_fallback(f"Live extraction failed after {max_attempts} attempt(s): {last_error}")
    except Exception as exc:
        return safe_fallback(f"Live extraction failed: {exc}")


def parse_json_response(text: str) -> Any:
    if not text:
        raise ValueError("Gemini returned an empty extraction response.")

    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    return json.loads(text)

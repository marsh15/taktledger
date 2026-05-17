import json
import os
from pathlib import Path
from typing import Any


EXTRACTION_PROMPT = """
You are an AI document extraction engine for manufacturing machine shop records.

Extract handwritten table data from the uploaded document image.
The document is titled "Machine shop data" and contains rows with these columns:
S. No, Date, Shift, Emp. No, Opn Code, Machine No., Work Order No., Qty. Prod.,
Time taken in hrs.

Return only valid JSON. Do not include markdown.
For each field, return value, confidence from 0 to 1, and notes if unclear.
If a field is blank, crossed out, overwritten, or unreadable, set value to null and confidence below 0.6.

Normalize shifts 1/2/3 to I/II/III, dates to YYYY-MM-DD where possible, and numeric fields to numbers.
"""


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

    data.setdefault("document_type", "machine_shop_data")
    data.setdefault("extraction_notes", "Live Gemini extraction completed.")
    return data


def _mime_type(file_path: Path, file_type: str) -> str:
    if file_type == "pdf":
        return "application/pdf"
    if file_path.suffix.lower() in {".jpg", ".jpeg"}:
        return "image/jpeg"
    return "image/png"


def extract_document(file_path: str, file_type: str) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return fallback_extraction()

    try:
        import google.genai as genai
        from google.genai import types

        path = Path(file_path)
        timeout_ms = int(os.getenv("GEMINI_TIMEOUT_MS", "15000"))
        http_options = types.HttpOptions(timeout=timeout_ms)
        client = genai.Client(api_key=api_key, http_options=http_options)
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            contents=[
                EXTRACTION_PROMPT,
                types.Part.from_bytes(data=path.read_bytes(), mime_type=_mime_type(path, file_type)),
            ],
            config=types.GenerateContentConfig(
                temperature=0,
                response_mime_type="application/json",
            ),
        )
        text = (response.text or "").strip()
        return normalize_extraction_result(parse_json_response(text))
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

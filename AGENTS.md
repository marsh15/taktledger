# TaktLedger Agent Notes

## Product Goal

TaktLedger demonstrates a full manufacturing record digitization workflow:

```text
Upload handwritten sheet -> Extract table data -> Review/edit fields -> Validate exceptions -> Save records -> Search/history/analytics
```

## AI Extraction Behavior

- Primary path: OpenAI vision extraction when `OPENAI_API_KEY` is configured.
- Demo-safe path: deterministic fallback extraction when live AI is unavailable or times out.
- Each extracted field carries a value, confidence score, and optional notes.
- Low-confidence, crossed-out, blank, duplicate, or format-mismatched fields remain editable for human review.

## Validation Behavior

Validation checks include required dates, shift values, employee/machine/work-order formats, duplicate work orders, missing quantities, suspicious quantity/time values, and low-confidence fields.

Errors block final approval. Warnings remain visible but can be saved after human review.

## Demo Flow

1. Open the dashboard.
2. Upload a JPG/PNG/PDF machine-shop sheet.
3. Confirm document preview.
4. Process the document.
5. Review extracted rows beside the source document.
6. Edit an uncertain field.
7. Re-run validation.
8. Save reviewed records.
9. Reopen the upload from history.
10. Search/filter records and confirm dashboard analytics update.

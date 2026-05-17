# Assumptions and Tradeoffs

## Assignment Scope

TaktLedger is built as a 48-hour full-stack/AI engineering assignment prototype. The focus is to demonstrate a complete workflow from handwritten document upload to structured, validated, reviewable records and analytics.

## Product Assumptions

- Reviewers will test the workflow using sample machine shop sheet images.
- Perfect OCR is not required; uncertain fields should be routed to manual review.
- Human correction is part of the intended workflow.
- Some production sheets may contain blanks, dashes, crossed-out values, duplicate work orders, and short dates.
- Duplicate work orders may be valid across shifts, so duplicates are warnings instead of hard blockers.
- Missing quantity should be reviewable because operators may leave quantity blank while still logging time.

## Technical Tradeoffs

- SQLite is used for fast local setup and easy review.
- Uploaded files are stored locally under `backend/uploads/`.
- Gemini is used for live AI extraction when `GEMINI_API_KEY` is configured.
- A deterministic fallback extractor is included so the demo works without network/API access.
- Confidence scores are approximate and meant to prioritize manual review.
- Authentication, permissions, audit logs, cloud object storage, and ERP/MES export are left as future improvements.

## Demo Tradeoffs

- The image upload path is the strongest path for the demo.
- PDF upload is accepted and previewed, but advanced multi-page PDF extraction is future work.
- The saved local SQLite database may contain sample/demo records from repeated testing.

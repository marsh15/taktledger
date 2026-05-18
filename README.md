# TaktLedger

## Overview

TaktLedger is a manufacturing record digitization and validation workflow for handwritten machine shop production sheets. It converts uploaded shop-floor documents into structured, editable, validated records and then turns those records into history, search, and dashboard analytics.

The goal is not perfect OCR. The goal is a complete human-in-the-loop workflow where uncertain extraction results are highlighted, corrected, validated, saved, and made analytics-ready.

## Problem Statement

Machine shop teams often capture production details such as date, shift, employee number, operation code, machine number, work order number, quantity produced, and time taken on handwritten forms. Manual data entry is slow, operational errors are easy to miss, duplicate work orders can slip through, and managers often see production trends too late.

TaktLedger demonstrates how handwritten production sheets can be digitized into reviewable operational records with confidence scoring, validation, exception handling, and analytics.

## Features

- Document upload for JPG, PNG, and PDF files
- Image/PDF preview after upload
- AI/OCR extraction of machine shop table data
- Editable human-in-the-loop review workflow
- Field confidence indicators for high, medium, and low confidence fields
- Validation and exception handling for operational data
- Highlighting for uncertain, invalid, blank, duplicate, and suspicious fields
- Save reviewed records after manual correction
- Upload history with the ability to reopen prior documents
- Search/filter records by employee, machine, work order, shift, and status
- Dashboard analytics for upload counts, extracted records, review status, validation failures, quantities, hours, shifts, and machines

## Tech Stack

Frontend: React, TypeScript, Vite, Tailwind CSS, Recharts, lucide-react

Backend: FastAPI, Pydantic, SQLAlchemy

Database: SQLite

AI/OCR: OpenAI vision extraction with deterministic fallback extraction for reliable demos

Deployment: Local-first prototype; frontend can be deployed to Vercel/Netlify and backend to Render/Fly/Railway with environment variables configured

Storage: Local `backend/uploads/` directory for uploaded documents

## Product Workflow

```text
Upload -> Extract -> Review -> Validate -> Save -> Analyze
```

1. Upload a handwritten machine shop sheet.
2. Preview the uploaded image or PDF.
3. Run AI/OCR extraction into structured production records.
4. Review extracted rows beside the original document.
5. Edit uncertain or invalid fields manually.
6. Re-run validation and inspect warnings/errors.
7. Save reviewed records.
8. Reopen prior uploads from history.
9. Search/filter saved records.
10. View dashboard analytics.

## Architecture Overview

```text
React UI
  -> FastAPI upload/process/review APIs
  -> AI extraction layer: OpenAI vision or fallback rows
  -> Validation layer: normalization, business rules, warnings, errors
  -> SQLite database: uploads, production records, validation issues
  -> Dashboard/history/search APIs
```

The frontend owns the product workflow screens: dashboard, upload, review, history, and records search. The backend owns file upload, document processing, validation, persistence, and analytics aggregation. The extraction layer returns field-level values, confidence scores, and notes. The validation layer normalizes operational fields and creates review issues.

## Validation Rules

- Missing date is an error
- Date values are normalized to `YYYY-MM-DD`; missing year defaults to the current year
- Invalid shift values are errors
- Missing employee number is an error
- Employee number should match `BT####`
- Operation code should be a 5 to 6 digit number
- Missing work order number is an error
- Duplicate work order numbers create warnings
- Machine number should usually match `MC-###`; non-standard formats create warnings
- Empty quantity fields create warnings
- Suspicious quantity values create warnings
- Time taken must be greater than `0`
- Time taken above `24` hours is treated as invalid/suspicious
- Low-confidence fields create warnings for manual review
- Quantity per hour is calculated when quantity and time are available

## Setup Instructions

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Production build:

```bash
cd frontend
npm run build
```

## Render Deployment

The backend can serve the compiled React app from the same Render Web Service. Use the included `render.yaml` blueprint, or configure an existing Render service with these settings:

```bash
# Build command, from the repo root
cd frontend && npm ci && npm run build && cd ../backend && pip install -r requirements.txt
```

```bash
# Start command, from the repo root
cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

If your Render service has `Root Directory` set to `backend`, use this build command instead:

```bash
cd ../frontend && npm ci && npm run build && cd ../backend && pip install -r requirements.txt
```

Set `OPENAI_API_KEY` in Render's environment variables. Do not put real API keys in the repository.

For live OpenAI extraction, use:

```text
OPENAI_MODEL=gpt-4.1
OPENAI_TIMEOUT_MS=45000
OPENAI_MAX_ATTEMPTS=2
OPENAI_REQUIRE_LIVE=true
```

The extraction layer requests structured JSON from OpenAI, retries transient failures, and falls back only when live extraction times out or returns no usable row data.
Set `OPENAI_REQUIRE_LIVE=true` when you want `/process` to fail with the OpenAI error instead of using deterministic fallback rows.

## Vercel Frontend Deployment

If you deploy the React frontend separately on Vercel, set the Vercel project root directory to `frontend`.

Set this Vercel environment variable:

```text
VITE_API_URL=https://taktledger.onrender.com
```

Then redeploy the Vercel project. The backend allows `*.vercel.app` origins by default. For a custom frontend domain, set `CORS_ORIGIN_REGEX` on Render to include that domain.

## Environment Variables

Copy `.env.example` to `.env` and fill only the keys you need.

```text
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1
OPENAI_TIMEOUT_MS=45000
OPENAI_MAX_ATTEMPTS=2
OPENAI_REQUIRE_LIVE=true
DATABASE_URL=sqlite:///./taktledger.db
VITE_API_URL=http://localhost:8000
```

`OPENAI_API_KEY` is optional for local demos. If it is empty or live extraction fails, TaktLedger uses deterministic fallback extraction so the upload-review-save-analytics workflow remains testable.

Do not commit real API keys.

## Assumptions and Tradeoffs

- This is a 48-hour assignment prototype, not a full production system.
- SQLite and local upload storage keep the app easy to run and review.
- Same work order across shifts may be valid, so duplicate work orders are warnings instead of hard failures.
- Quantity can be blank in real handwritten forms, so missing quantity is reviewable rather than always blocking.
- AI confidence scores are approximate and guide human review.
- Fallback extraction is included to keep the demo reliable if OpenAI is unavailable, slow, or rate-limited.
- Authentication, roles, ERP integration, audit trails, and production object storage are intentionally out of scope.

## Demo Links

GitHub: https://github.com/marsh15/taktledger

Hosted URL: add hosted demo URL after deployment.

Demo Video: add video link after recording.

## Additional Documents

- `AI_WORKFLOW.md`: AI-assisted development workflow
- `AGENTS.md`: concise product and demo workflow notes
- `ARCHITECTURE.md`: system architecture overview

## Future Improvements

- Authentication and role-based review queues
- CSV export and ERP/MES integration
- Better OCR/table detection pipeline
- Multi-page PDF extraction and page-level review
- Audit trail for every field correction
- Advanced analytics by operator, machine, operation code, and work order
- Cloud file storage and production database deployment

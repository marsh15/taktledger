# Architecture Overview

## System Summary

TaktLedger is a local-first full-stack prototype for digitizing handwritten machine shop production records.

```text
React frontend
  -> FastAPI backend
  -> AI extraction layer
  -> Validation layer
  -> SQLite persistence
  -> Analytics/search/history APIs
```

## Frontend

The frontend is built with React, TypeScript, Vite, Tailwind CSS, Recharts, and lucide-react.

Main screens:

- Dashboard: metrics, validation summaries, shift summaries, and machine summaries
- Upload: drag/drop or file select, preview, processing status, and recent uploads
- Review: source document preview, editable extracted records, confidence badges, validation issues, and save workflow
- History: previous uploads with status, row counts, issue counts, and reopen action
- Records: searchable/filterable production records

## Backend

The backend is built with FastAPI, Pydantic, and SQLAlchemy.

Main API areas:

- Upload document
- Process document
- Fetch upload and records
- Update records
- Re-run validation
- Save reviewed upload
- List upload history
- Search/filter records
- Aggregate analytics summary

## Database

SQLite stores:

- Uploads
- Production records
- Validation issues

Each production record stores extracted field values, field confidence scores, field notes, review status, and calculated quantity per hour.

## AI Extraction Layer

The extraction layer uses OpenAI vision when `OPENAI_API_KEY` is available. It asks the model to return strict JSON with:

- `value`
- `confidence`
- `notes`

If live extraction is unavailable or returns an unusable response, deterministic fallback rows are used so the full product workflow remains demoable.

## Validation Layer

The validation layer normalizes and checks manufacturing fields:

- Date normalization
- Shift normalization
- Employee number format
- Operation code format
- Machine number format
- Work order format
- Duplicate work orders
- Missing or suspicious quantity
- Invalid or suspicious time
- Low-confidence fields

Errors block approval. Warnings stay visible for human review.

## Analytics Layer

Dashboard analytics are calculated from persisted records:

- Total uploads
- Total extracted records
- Records needing review
- Validation failures
- Total quantity produced
- Total hours logged
- Average quantity per hour
- Shift summaries
- Machine summaries
- Validation issue summaries
- Status summaries

# AI Workflow Document

## AI Tools Used

- ChatGPT/Codex for product planning, implementation, debugging, and documentation
- Cursor-style AI-assisted development workflow for breaking work into small implementation passes
- OpenAI vision model for optional live document extraction
- Deterministic fallback extraction for repeatable local demos

## How AI Tools Were Used

- PRD planning from the assignment requirements
- Architecture planning for frontend, backend, database, extraction, validation, and analytics layers
- OCR prompt design for structured machine shop table extraction
- Backend API implementation for upload, process, review, save, history, records, and analytics
- Frontend component generation for dashboard, upload, review, history, and search screens
- Validation rule implementation for manufacturing-specific fields
- Debugging API contracts, TypeScript types, validation behavior, and demo flow
- README and submission document improvement

## AI-Assisted Development Workflow

1. Broke the assignment into product modules: upload, extraction, review, validation, persistence, history, search, and analytics.
2. Generated and refined code section by section instead of building one large monolithic feature.
3. Manually reviewed generated code for project fit, naming consistency, validation correctness, and demo readiness.
4. Tested the upload, extraction, review, dashboard, history, and records workflows end to end.
5. Fixed bugs through iterative prompting and local verification.
6. Reworked user-facing screens so the final result looked like a mini-product, not only OCR output.

## Prompting Strategy

- For structured JSON extraction, prompts specify the expected machine shop columns and require valid JSON only.
- For confidence scoring, prompts ask the model to return a confidence value and note for every field.
- For unclear handwriting, blank cells, crossed-out values, and overwritten fields, prompts ask the model to lower confidence and mark the field for review.
- For manufacturing validation rules, prompts define expected date, shift, employee, machine, work order, quantity, and time formats.
- For dashboard metrics, prompts map saved records into upload counts, review status counts, quantities, hours, shift summaries, machine summaries, and validation issue summaries.

## Areas Where AI Helped Most

- Fast UI scaffolding for the full workflow
- API route generation and schema shaping
- Validation rule design and implementation
- Extraction prompt design
- Dashboard metric planning
- Debugging frontend/backend integration issues
- Documentation cleanup for submission readiness

## Areas Requiring Manual Intervention

- Product decisions and final workflow scope
- Dataset interpretation and deciding which fields should be treated as warnings versus errors
- Validation thresholds for confidence, quantity, and time values
- Testing the actual upload, preview, extraction, review, save, history, records, and dashboard flow
- Fixing model extraction mistakes through human review behavior
- Deployment configuration and final hosted demo setup

## Limitations

- Handwriting extraction may not be perfect.
- Confidence scores are approximate and should guide, not replace, human review.
- Low-quality images, crossed-out values, and unclear scans may need manual correction.
- PDF upload is supported, but image upload is the strongest demo path.
- SQLite and local file storage are prototype choices for assignment speed.
- Authentication, user roles, audit logs, and ERP/MES integrations are out of scope for this prototype.

## Future Improvements

- Better OCR/table detection pipeline
- Human approval queue with assignment and review ownership
- CSV export
- ERP/MES integration
- Authentication and role-based access
- Audit history for each field correction
- Multi-page PDF splitting and page-level extraction
- Advanced analytics by operator, machine, operation code, shift, and work order

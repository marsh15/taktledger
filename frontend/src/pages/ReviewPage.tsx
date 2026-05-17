import { AlertTriangle, CheckCircle2, FileText, Loader2, RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { api, API_BASE } from "../lib/api";
import type { ProductionRecord, RecordPatch, UploadWithRecords, ValidationIssue } from "../types/api";

const editableFields: Array<{ key: keyof RecordPatch; label: string; type?: "number" }> = [
  { key: "date", label: "Date" },
  { key: "shift", label: "Shift" },
  { key: "employee_no", label: "Employee No" },
  { key: "operation_code", label: "Opn Code" },
  { key: "machine_no", label: "Machine No" },
  { key: "work_order_no", label: "Work Order" },
  { key: "quantity_produced", label: "Qty", type: "number" },
  { key: "time_taken_hours", label: "Hours", type: "number" }
];

type DraftRecord = Record<string, string>;

export default function ReviewPage() {
  const { uploadId } = useParams();
  const [upload, setUpload] = useState<UploadWithRecords | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftRecord>>({});
  const [busyRow, setBusyRow] = useState("");
  const [saving, setSaving] = useState(false);
  const [validatingAll, setValidatingAll] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uploadId) return;
    api
      .getUpload(uploadId)
      .then((data) => {
        setUpload(data);
        setDrafts(makeDrafts(data.records));
      })
      .catch((err) => setError(err.message));
  }, [uploadId]);

  const issueCounts = useMemo(() => {
    const issues = upload?.records.flatMap((record) => record.issues) ?? [];
    return {
      errors: issues.filter((issue) => issue.severity === "error").length,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
      info: issues.filter((issue) => issue.severity === "info").length
    };
  }, [upload]);

  const validationIssues = useMemo(
    () =>
      upload?.records.flatMap((record, recordIndex) =>
        record.issues
          .filter((issue) => issue.severity !== "info")
          .map((issue) => ({
            ...issue,
            rowLabel: record.serial_no ?? recordIndex + 1
          }))
      ) ?? [],
    [upload]
  );

  function replaceRecord(nextRecord: ProductionRecord) {
    setUpload((current) => {
      if (!current) return current;
      return {
        ...current,
        records: current.records.map((record) => (record.id === nextRecord.id ? nextRecord : record))
      };
    });
    setDrafts((current) => ({ ...current, [nextRecord.id]: makeDraft(nextRecord) }));
  }

  function updateDraft(recordId: string, field: keyof RecordPatch, value: string) {
    setDrafts((current) => ({
      ...current,
      [recordId]: {
        ...current[recordId],
        [field]: value
      }
    }));
  }

  async function saveRowData(record: ProductionRecord) {
    const payload = draftToPayload(drafts[record.id]);
    const updated = await api.updateRecord(record.id, payload);
    replaceRecord(updated);
    return updated;
  }

  async function saveRow(record: ProductionRecord) {
    setBusyRow(record.id);
    setError("");
    try {
      await saveRowData(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save row");
    } finally {
      setBusyRow("");
    }
  }

  async function validateRow(record: ProductionRecord) {
    setBusyRow(record.id);
    setError("");
    try {
      const saved = await saveRowData(record);
      const validated = await api.validateRecord(saved.id);
      replaceRecord(validated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to validate row");
    } finally {
      setBusyRow("");
    }
  }

  async function validateAllRows() {
    if (!upload) return;
    setValidatingAll(true);
    setError("");
    try {
      const updatedRecords: ProductionRecord[] = [];
      for (const record of upload.records) {
        const saved = await api.updateRecord(record.id, draftToPayload(drafts[record.id]));
        const validated = await api.validateRecord(saved.id);
        updatedRecords.push(validated);
      }
      setUpload((current) => (current ? { ...current, records: updatedRecords } : current));
      setDrafts(makeDrafts(updatedRecords));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to validate records");
    } finally {
      setValidatingAll(false);
    }
  }

  async function approveUpload() {
    if (!upload) return;
    setSaving(true);
    setError("");
    try {
      for (const record of upload.records) {
        const updated = await api.updateRecord(record.id, draftToPayload(drafts[record.id]));
        replaceRecord(updated);
      }
      const approved = await api.approveUpload(upload.id);
      setUpload(approved);
      setDrafts(makeDrafts(approved.records));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve records");
    } finally {
      setSaving(false);
    }
  }

  if (error && !upload) {
    return <EmptyState icon={AlertTriangle} title={error} />;
  }

  if (!upload) {
    return <div className="rounded-md border border-line bg-[#FAFBF7] p-6 text-sm text-steel">Loading review workspace...</div>;
  }

  const sourceUrl = `${API_BASE}${upload.file_url}`;
  const isPdf = upload.file_type === "pdf";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-2xl font-semibold">Review extraction</h1>
          <p className="mt-1 max-w-4xl text-sm text-steel">{upload.file_name}</p>
          {upload.extraction_notes && <p className="mt-2 max-w-4xl rounded-md border border-line bg-[#FAFBF7] p-3 text-xs text-steel">{upload.extraction_notes}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={validateAllRows}
            disabled={validatingAll || saving}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink disabled:text-steel"
          >
            {validatingAll ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
            Re-run Validation
          </button>
          <button
            type="button"
            onClick={approveUpload}
            disabled={saving || validatingAll}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-signal px-4 py-3 text-sm font-semibold text-white disabled:bg-[#9BA9A2]"
          >
            {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
            Save Reviewed Records
          </button>
        </div>
      </div>

      {error && (
        <div className="flex gap-2 rounded-md border border-[#E8A39E] bg-[#FFE1DD] p-3 text-sm text-danger">
          <AlertTriangle size={17} />
          {error}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[430px_1fr]">
        <div className="rounded-md border border-line bg-[#FAFBF7] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Source document</h2>
            <StatusBadge status={upload.processing_status} />
          </div>
          {isPdf ? (
            <iframe title="Source PDF" src={sourceUrl} className="h-[680px] w-full rounded-md border border-line bg-white" />
          ) : (
            <img src={sourceUrl} alt="Source document" className="max-h-[680px] w-full rounded-md border border-line bg-white object-contain" />
          )}
        </div>

        <div className="min-w-0 rounded-md border border-line bg-[#FAFBF7] p-4">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-semibold">Extracted Records Table</h2>
              <p className="mt-1 text-sm text-steel">Edit any uncertain field before saving reviewed production records.</p>
            </div>
            <StatusBadge status={upload.processing_status} />
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <SummaryBox label="Errors" value={issueCounts.errors} tone="danger" />
            <SummaryBox label="Warnings" value={issueCounts.warnings} tone="warn" />
            <SummaryBox label="Info" value={issueCounts.info} tone="neutral" />
          </div>

          <section className="mb-4 rounded-md border border-line bg-white p-3">
            <div className="mb-2 text-sm font-semibold">Validation Summary</div>
            <div className="mb-2 flex gap-3 text-sm">
              <span className="text-danger">Errors: {issueCounts.errors}</span>
              <span className="text-amber">Warnings: {issueCounts.warnings}</span>
            </div>
            {validationIssues.length === 0 ? (
              <div className="text-sm text-steel">No validation warnings or errors.</div>
            ) : (
              <ul className="max-h-36 space-y-1 overflow-y-auto pr-1 text-sm scrollbar-thin">
                {validationIssues.map((issue) => (
                  <li key={issue.id} className={issue.severity === "error" ? "text-danger" : "text-amber"}>
                    Row {issue.rowLabel}: {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[1280px] border-separate border-spacing-0 text-left text-sm">
              <thead className="bg-[#E7EBE2] text-xs uppercase text-steel">
                <tr>
                  <th className="rounded-l-md px-3 py-3">Row</th>
                  {editableFields.map((field) => (
                    <th key={field.key} className="px-3 py-3">{field.label}</th>
                  ))}
                  <th className="px-3 py-3">Status</th>
                  <th className="rounded-r-md px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {upload.records.map((record) => (
                  <tr key={record.id} className="align-top">
                    <td className="border-b border-line px-3 py-3 font-semibold">{record.serial_no ?? "-"}</td>
                    {editableFields.map((field) => (
                      <td key={field.key} className="border-b border-line px-3 py-3">
                        <FieldEditor
                          record={record}
                          field={field}
                          value={drafts[record.id]?.[field.key] ?? ""}
                          issues={record.issues.filter((issue) => issue.field_name === field.key)}
                          onChange={(value) => updateDraft(record.id, field.key, value)}
                        />
                      </td>
                    ))}
                    <td className="border-b border-line px-3 py-3">
                      <StatusBadge status={record.review_status} />
                    </td>
                    <td className="border-b border-line px-3 py-3">
                      <div className="flex gap-2">
                        <button className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-steel" type="button" onClick={() => validateRow(record)} disabled={busyRow === record.id} title="Validate row">
                          {busyRow === record.id ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />}
                        </button>
                        <button className="grid h-9 w-9 place-items-center rounded-md bg-ink text-white" type="button" onClick={() => saveRow(record)} disabled={busyRow === record.id} title="Save row">
                          {busyRow === record.id ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function FieldEditor({
  record,
  field,
  value,
  issues,
  onChange
}: {
  record: ProductionRecord;
  field: { key: keyof RecordPatch; label: string; type?: "number" };
  value: string;
  issues: ValidationIssue[];
  onChange: (value: string) => void;
}) {
  const confidence = record.field_confidence_json[field.key];
  const hasProblem = issues.some((issue) => issue.severity === "error" || issue.severity === "warning");
  return (
    <div className="min-w-[130px]">
      <input
        className={`h-10 w-full rounded-md border bg-white px-2 text-sm outline-none focus:border-signal ${
          hasProblem ? "border-[#E8A39E]" : "border-line"
        }`}
        type={field.type === "number" ? "number" : "text"}
        step={field.key === "time_taken_hours" ? "0.1" : "1"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="mt-2 flex items-center gap-2">
        <ConfidenceBadge value={confidence} />
      </div>
      {record.field_notes_json[field.key] && <div className="mt-2 text-xs text-steel">{record.field_notes_json[field.key]}</div>}
      {issues.map((issue) => (
        <div key={issue.id} className={`mt-2 text-xs ${issue.severity === "error" ? "text-danger" : issue.severity === "warning" ? "text-amber" : "text-steel"}`}>
          {issue.message}
        </div>
      ))}
    </div>
  );
}

function SummaryBox({ label, value, tone }: { label: string; value: number; tone: "danger" | "warn" | "neutral" }) {
  const toneClass = tone === "danger" ? "text-danger" : tone === "warn" ? "text-amber" : "text-steel";
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="text-xs uppercase text-steel">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function makeDraft(record: ProductionRecord): DraftRecord {
  return {
    date: record.date ?? "",
    shift: record.shift ?? "",
    employee_no: record.employee_no ?? "",
    operation_code: record.operation_code ?? "",
    machine_no: record.machine_no ?? "",
    work_order_no: record.work_order_no ?? "",
    quantity_produced: record.quantity_produced === null ? "" : String(record.quantity_produced),
    time_taken_hours: record.time_taken_hours === null ? "" : String(record.time_taken_hours)
  };
}

function makeDrafts(records: ProductionRecord[]): Record<string, DraftRecord> {
  return Object.fromEntries(records.map((record) => [record.id, makeDraft(record)]));
}

function draftToPayload(draft: DraftRecord): RecordPatch {
  return {
    date: draft.date || null,
    shift: draft.shift || null,
    employee_no: draft.employee_no || null,
    operation_code: draft.operation_code || null,
    machine_no: draft.machine_no || null,
    work_order_no: draft.work_order_no || null,
    quantity_produced: draft.quantity_produced === "" ? null : Number(draft.quantity_produced),
    time_taken_hours: draft.time_taken_hours === "" ? null : Number(draft.time_taken_hours)
  };
}

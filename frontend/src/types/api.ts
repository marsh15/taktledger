export type Severity = "error" | "warning" | "info";
export type ReviewStatus = "needs_review" | "approved" | "saved" | "validation_failed";

export interface ValidationIssue {
  id: string;
  record_id: string;
  field_name: string;
  severity: Severity;
  issue_code: string;
  message: string;
  created_at: string;
}

export interface ProductionRecord {
  id: string;
  upload_id: string;
  serial_no: number | null;
  date: string | null;
  shift: string | null;
  employee_no: string | null;
  operation_code: string | null;
  machine_no: string | null;
  work_order_no: string | null;
  quantity_produced: number | null;
  time_taken_hours: number | null;
  quantity_per_hour: number | null;
  review_status: ReviewStatus;
  field_confidence_json: Record<string, number>;
  field_notes_json: Record<string, string>;
  issues: ValidationIssue[];
  created_at: string;
  updated_at: string;
}

export interface Upload {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  processing_status: string;
  total_rows_extracted: number;
  total_validation_errors: number;
  total_validation_warnings: number;
  extraction_notes: string | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export interface UploadWithRecords extends Upload {
  records: ProductionRecord[];
}

export interface QuantitySummary {
  name: string;
  records: number;
  quantity: number;
  hours: number;
  validation_issue_count: number;
  average_quantity_per_hour: number;
}

export interface IssueSummary {
  issue_code: string;
  severity: Severity;
  count: number;
}

export interface StatusSummary {
  status: ReviewStatus;
  count: number;
}

export interface AnalyticsSummary {
  total_uploads: number;
  total_records: number;
  approved_records: number;
  records_needing_review: number;
  validation_failures: number;
  total_quantity_produced: number;
  total_time_taken: number;
  average_time_per_record: number;
  average_quantity_per_hour: number;
  shift_summary: QuantitySummary[];
  machine_summary: QuantitySummary[];
  issue_summary: IssueSummary[];
  status_summary: StatusSummary[];
}

export type RecordPatch = Partial<
  Pick<
    ProductionRecord,
    | "date"
    | "shift"
    | "employee_no"
    | "operation_code"
    | "machine_no"
    | "work_order_no"
    | "quantity_produced"
    | "time_taken_hours"
  >
>;

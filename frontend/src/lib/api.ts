import type { AnalyticsSummary, ProductionRecord, RecordPatch, Upload, UploadWithRecords } from "../types/api";

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.detail ?? message;
    } catch {
      // Keep the HTTP status text.
    }
    throw new Error(Array.isArray(message) ? message.map((item) => item.msg).join(", ") : message);
  }
  return response.json();
}

export const api = {
  uploadDocument(file: File): Promise<{ upload_id: string; file_name: string; status: string }> {
    const formData = new FormData();
    formData.append("file", file);
    return request("/api/uploads", { method: "POST", body: formData });
  },
  processUpload(uploadId: string): Promise<{ upload_id: string; status: string; records: ProductionRecord[] }> {
    return request(`/api/uploads/${uploadId}/process`, { method: "POST" });
  },
  listUploads(): Promise<Upload[]> {
    return request("/api/uploads");
  },
  getUpload(uploadId: string): Promise<UploadWithRecords> {
    return request(`/api/uploads/${uploadId}`);
  },
  updateRecord(recordId: string, payload: RecordPatch): Promise<ProductionRecord> {
    return request(`/api/records/${recordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  },
  validateRecord(recordId: string): Promise<ProductionRecord> {
    return request(`/api/records/${recordId}/validate`, { method: "POST" });
  },
  approveUpload(uploadId: string): Promise<UploadWithRecords> {
    return request(`/api/uploads/${uploadId}/approve`, { method: "POST" });
  },
  listRecords(params: URLSearchParams): Promise<ProductionRecord[]> {
    const query = params.toString();
    return request(`/api/records${query ? `?${query}` : ""}`);
  },
  getAnalytics(): Promise<AnalyticsSummary> {
    return request("/api/analytics/summary");
  }
};

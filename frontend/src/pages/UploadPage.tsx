import { AlertTriangle, FileImage, Loader2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";
import type { Upload } from "../types/api";

const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("ready");
  const [recentUploads, setRecentUploads] = useState<Upload[]>([]);

  const isPdf = useMemo(() => file?.type === "application/pdf", [file]);

  useEffect(() => {
    api.listUploads().then((uploads) => setRecentUploads(uploads.slice(0, 5))).catch(() => setRecentUploads([]));
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function selectFile(nextFile?: File) {
    setError("");
    if (!nextFile) return;
    if (!allowedTypes.includes(nextFile.type)) {
      setFile(null);
      setPreviewUrl("");
      setError("Unsupported file type. Use JPG, PNG, or PDF.");
      return;
    }
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setStatus("ready");
  }

  async function processFile() {
    if (!file) return;
    setIsProcessing(true);
    setError("");
    try {
      setStatus("uploaded");
      const created = await api.uploadDocument(file);
      setStatus("processing");
      await api.processUpload(created.upload_id);
      setStatus("extracted");
      navigate(`/uploads/${created.upload_id}/review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload Machine Shop Document</h1>
        <p className="mt-1 max-w-3xl text-sm text-steel">
          Process handwritten machine-shop forms into editable, validated records.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="rounded-md border border-line bg-[#FAFBF7] p-5">
          <div
            className={`grid min-h-[280px] place-items-center rounded-md border border-dashed p-6 text-center ${
              isDragging ? "border-signal bg-[#E0F1E9]" : "border-line bg-white"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              selectFile(event.dataTransfer.files[0]);
            }}
          >
            <div>
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-md bg-[#E7EBE2] text-steel">
                <UploadCloud size={25} />
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">
                <UploadCloud size={16} />
                Select file
                <input className="hidden" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => selectFile(event.target.files?.[0])} />
              </label>
              {file && <div className="mt-4 text-sm font-medium">{file.name}</div>}
              <div className="mt-2 text-xs text-steel">Supported formats: JPG, PNG, PDF</div>
            </div>
          </div>
          {error && (
            <div className="mt-4 flex gap-2 rounded-md border border-[#E8A39E] bg-[#FFE1DD] p-3 text-sm text-danger">
              <AlertTriangle size={17} />
              {error}
            </div>
          )}
          <button
            type="button"
            disabled={!file || isProcessing}
            onClick={processFile}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-signal px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9BA9A2]"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={17} /> : <FileImage size={17} />}
            {isProcessing ? "Processing document" : "Upload & Process Document"}
          </button>

          <div className="mt-4 rounded-md border border-line bg-white p-3 text-sm">
            <div className="mb-2 text-xs uppercase text-steel">Status</div>
            <StatusBadge status={status} />
          </div>

          <div className="mt-4 rounded-md border border-line bg-white p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-steel">Recent uploads</div>
            {recentUploads.length === 0 ? (
              <div className="text-sm text-steel">No upload history yet.</div>
            ) : (
              <div className="space-y-2">
                {recentUploads.map((upload) => (
                  <Link key={upload.id} to={`/uploads/${upload.id}/review`} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm hover:bg-[#F3F6F1]">
                    <span className="truncate font-medium">{upload.file_name}</span>
                    <StatusBadge status={upload.processing_status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="min-h-[480px] rounded-md border border-line bg-[#FAFBF7] p-5">
          <h2 className="mb-4 text-base font-semibold">Preview</h2>
          {!previewUrl ? (
            <div className="grid h-[390px] place-items-center rounded-md border border-dashed border-line bg-white text-sm text-steel">
              No document selected
            </div>
          ) : isPdf ? (
            <iframe title="PDF preview" src={previewUrl} className="h-[620px] w-full rounded-md border border-line bg-white" />
          ) : (
            <img src={previewUrl} alt="Selected document preview" className="max-h-[620px] w-full rounded-md border border-line bg-white object-contain" />
          )}
        </section>
      </div>
    </div>
  );
}

import { AlertTriangle, ExternalLink, History } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { api, API_BASE } from "../lib/api";
import type { Upload } from "../types/api";

export default function HistoryPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listUploads()
      .then(setUploads)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load upload history"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="rounded-md border border-line bg-[#FAFBF7] p-6 text-sm text-steel">Loading history...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload history</h1>
        <p className="mt-1 max-w-3xl text-sm text-steel">Review prior document runs and reopen extracted records.</p>
      </div>

      {error ? (
        <EmptyState icon={AlertTriangle} title={error} />
      ) : uploads.length === 0 ? (
        <EmptyState icon={History} title="No uploaded documents yet" action={<Link to="/upload" className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">Upload document</Link>} />
      ) : (
        <section className="overflow-hidden rounded-md border border-line bg-[#FAFBF7]">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#E7EBE2] text-xs uppercase text-steel">
                <tr>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rows</th>
                  <th className="px-4 py-3">Errors</th>
                  <th className="px-4 py-3">Warnings</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {uploads.map((upload) => (
                  <tr key={upload.id} className="bg-[#FAFBF7]">
                    <td className="px-4 py-3 font-medium">{upload.file_name}</td>
                    <td className="px-4 py-3 text-steel">{new Date(upload.uploaded_at).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={upload.processing_status} /></td>
                    <td className="px-4 py-3">{upload.total_rows_extracted}</td>
                    <td className="px-4 py-3 text-danger">{upload.total_validation_errors}</td>
                    <td className="px-4 py-3 text-amber">{upload.total_validation_warnings}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link className="rounded-md bg-ink px-3 py-2 text-xs font-semibold text-white" to={`/uploads/${upload.id}/review`}>
                          Open
                        </Link>
                        <a className="grid h-8 w-8 place-items-center rounded-md border border-line text-steel" href={`${API_BASE}${upload.file_url}`} target="_blank" rel="noreferrer" title="Open source file">
                          <ExternalLink size={15} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

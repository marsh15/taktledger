import { AlertTriangle, ClipboardCheck, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";
import type { ProductionRecord } from "../types/api";

const machineOptions = ["MC-730", "MC-780", "MC-850", "MC-840"];

export default function RecordsPage() {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    shift: "",
    machine_no: "",
    employee_no: "",
    work_order_no: "",
    status: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) next.set(key, value);
    });
    return next;
  }, [filters]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      api
        .listRecords(params)
        .then((data) => {
          if (active) setRecords(data);
        })
        .catch((err) => {
          if (active) {
            setError(err instanceof Error ? err.message : "Unable to load records");
            setRecords([]);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [params]);

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Production records</h1>
        <p className="mt-1 max-w-3xl text-sm text-steel">Search validated production data across uploaded shop-floor forms.</p>
      </div>

      <section className="rounded-md border border-line bg-[#FAFBF7] p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="relative md:col-span-3 xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel" size={16} />
            <input className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-signal" placeholder="Search records" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
          </label>
          <select className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-signal" value={filters.shift} onChange={(event) => updateFilter("shift", event.target.value)}>
            <option value="">All shifts</option>
            <option value="I">Shift I</option>
            <option value="II">Shift II</option>
            <option value="III">Shift III</option>
          </select>
          <select className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-signal" value={filters.machine_no} onChange={(event) => updateFilter("machine_no", event.target.value)}>
            <option value="">All machines</option>
            {machineOptions.map((machine) => (
              <option key={machine} value={machine}>{machine}</option>
            ))}
          </select>
          <input className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-signal" placeholder="Employee" value={filters.employee_no} onChange={(event) => updateFilter("employee_no", event.target.value)} />
          <input className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-signal" placeholder="Work order" value={filters.work_order_no} onChange={(event) => updateFilter("work_order_no", event.target.value)} />
          <select className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-signal" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="">All statuses</option>
            <option value="valid">Valid</option>
            <option value="needs_review">Needs review</option>
            <option value="error">Error</option>
          </select>
        </div>
      </section>

      {error ? (
        <EmptyState icon={AlertTriangle} title={error} />
      ) : loading ? (
        <div className="rounded-md border border-line bg-[#FAFBF7] p-6 text-sm text-steel">Loading records...</div>
      ) : records.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No records match the current filters" />
      ) : (
        <section className="overflow-hidden rounded-md border border-line bg-[#FAFBF7]">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-[#E7EBE2] text-xs uppercase text-steel">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Shift</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Operation</th>
                  <th className="px-4 py-3">Machine</th>
                  <th className="px-4 py-3">Work order</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Qty/hour</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3">{record.date ?? "-"}</td>
                    <td className="px-4 py-3">{record.shift ?? "-"}</td>
                    <td className="px-4 py-3 font-medium">{record.employee_no ?? "-"}</td>
                    <td className="px-4 py-3">{record.operation_code ?? "-"}</td>
                    <td className="px-4 py-3">{record.machine_no ?? "-"}</td>
                    <td className="px-4 py-3">{record.work_order_no ?? "-"}</td>
                    <td className="px-4 py-3">{record.quantity_produced ?? "-"}</td>
                    <td className="px-4 py-3">{record.time_taken_hours ?? "-"}</td>
                    <td className="px-4 py-3">{record.quantity_per_hour ?? "-"}</td>
                    <td className="px-4 py-3"><StatusBadge status={record.review_status} /></td>
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

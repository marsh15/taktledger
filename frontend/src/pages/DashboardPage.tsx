import { AlertTriangle, CheckCircle2, Clock3, Factory, FileStack, Gauge, PackageCheck, Rows3 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "../components/EmptyState";
import { MetricCard } from "../components/MetricCard";
import { api } from "../lib/api";
import type { AnalyticsSummary, QuantitySummary } from "../types/api";

const chartColors = ["#0E7C66", "#52606D", "#B7791F", "#C2413A", "#6B8F71", "#3B6EA8"];

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getAnalytics().then(setSummary).catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <EmptyState icon={AlertTriangle} title={error} />;
  }

  if (!summary) {
    return <div className="rounded-md border border-line bg-[#FAFBF7] p-6 text-sm text-steel">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-line pb-5">
        <div className="text-sm font-semibold uppercase text-signal">TaktLedger</div>
        <h1 className="mt-1 text-2xl font-semibold">Manufacturing Record Digitization & Validation Workflow</h1>
        <p className="mt-1 max-w-3xl text-sm text-steel">
          Dashboard analytics for uploaded machine-shop sheets, reviewed records, validation health, and production output.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Uploads" value={summary.total_uploads} icon={FileStack} />
        <MetricCard label="Total Extracted Records" value={summary.total_records} icon={Rows3} />
        <MetricCard label="Records Needing Review" value={summary.records_needing_review} icon={Clock3} tone="warn" />
        <MetricCard label="Validation Failures" value={summary.validation_failures} icon={AlertTriangle} tone="danger" />
        <MetricCard label="Reviewed Records" value={summary.approved_records} icon={CheckCircle2} tone="good" />
        <MetricCard label="Total Quantity Produced" value={summary.total_quantity_produced} icon={PackageCheck} tone="good" />
        <MetricCard label="Total Hours Logged" value={summary.total_time_taken} icon={Factory} />
        <MetricCard label="Average Qty / Hour" value={summary.average_quantity_per_hour} icon={Gauge} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Shift-wise quantity">
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={summary.shift_summary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9DED3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantity" fill="#0E7C66" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Machine-wise quantity">
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={summary.machine_summary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9DED3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantity" fill="#52606D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Records by status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={summary.status_summary} dataKey="count" nameKey="status" outerRadius={96} label>
                {summary.status_summary.map((item, index) => (
                  <Cell key={item.status} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
        <section className="rounded-md border border-line bg-[#FAFBF7] p-5">
          <h2 className="mb-4 text-base font-semibold">Validation issues</h2>
          <div className="space-y-2">
            {summary.issue_summary.length === 0 ? (
              <div className="text-sm text-steel">No validation issues yet.</div>
            ) : (
              summary.issue_summary.map((item) => (
                <div key={`${item.issue_code}-${item.severity}`} className="flex items-center justify-between rounded-md border border-line bg-white px-3 py-2 text-sm">
                  <span className="font-medium">{String(item.issue_code).replaceAll("_", " ")}</span>
                  <span className="text-steel">{item.count}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SummaryTable title="Shift summary" rows={summary.shift_summary} firstColumn="Shift" />
        <SummaryTable title="Machine summary" rows={summary.machine_summary} firstColumn="Machine" />
      </div>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-line bg-[#FAFBF7] p-5">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function SummaryTable({
  title,
  rows,
  firstColumn
}: {
  title: string;
  rows: QuantitySummary[];
  firstColumn: string;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-line bg-[#FAFBF7]">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-[#E7EBE2] text-xs uppercase text-steel">
            <tr>
              <th className="px-4 py-3">{firstColumn}</th>
              <th className="px-4 py-3">Records</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Avg Qty / Hour</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-steel" colSpan={5}>No records yet.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={String(row.name)}>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{row.records}</td>
                  <td className="px-4 py-3">{row.quantity}</td>
                  <td className="px-4 py-3">{row.hours}</td>
                  <td className="px-4 py-3">{row.average_quantity_per_hour}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileSpreadsheet, PlayCircle, TriangleAlert, Upload as UploadIcon } from "lucide-react";
import { AppShell } from "@/components/losscope/AppShell";
import { CSV_COLUMNS, CsvError, generateUrbanBiteData, parseCsv, toCsv } from "@/lib/losscope/data";
import { losscopeStore } from "@/lib/losscope/store";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload Operational Data — Losscope AI" },
      {
        name: "description",
        content:
          "Upload a CSV of sales, purchases, waste, delivery and payment data, or run the built-in UrbanBite Cafe demo dataset.",
      },
      { property: "og:title", content: "Upload Operational Data — Losscope AI" },
      { property: "og:description", content: "Bring your own CSV or run the UrbanBite Cafe demo dataset." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      if (!/\.(csv|txt)$/i.test(file.name)) {
        throw new CsvError(
          "Only CSV files are supported in this MVP. Export your spreadsheet or PDF statement as CSV first.",
        );
      }
      const text = await file.text();
      const rows = parseCsv(text);
      losscopeStore.loadRows(rows, file.name.replace(/\.[^.]+$/, ""), false);
      void navigate({ to: "/analysis" });
    } catch (e) {
      setError(
        e instanceof CsvError
          ? e.message
          : "We couldn't read that file. Check that it is a comma-separated CSV with a header row.",
      );
    } finally {
      setBusy(false);
    }
  };

  const downloadSample = () => {
    const csv = toCsv(generateUrbanBiteData());
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "urbanbite_30_days.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-semibold">Upload your operational data</h1>
        <p className="mt-2 text-muted-foreground">
          Losscope analyses sales, purchasing, waste, delivery and payment records to find avoidable loss.
        </p>

        <div className="panel mt-8 p-6">
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center transition-colors hover:bg-accent/40">
            <UploadIcon className="size-6 text-primary" />
            <span className="text-sm font-medium">
              {busy ? "Reading file…" : "Drop a CSV here or click to browse"}
            </span>
            <span className="text-xs text-muted-foreground">CSV up to a few thousand rows</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </label>

          {error ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-loss-soft px-4 py-3 text-sm text-loss">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => {
                losscopeStore.loadDemo();
                void navigate({ to: "/analysis" });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <PlayCircle className="size-4" /> Use UrbanBite demo data
            </button>
            <button
              onClick={downloadSample}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Download className="size-4" /> Download sample CSV
            </button>
          </div>
        </div>

        <div className="panel mt-6 p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <FileSpreadsheet className="size-4 text-primary" /> Expected columns
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Required: <span className="text-foreground">date, product, quantity_sold, quantity_purchased,
            unit_cost, selling_price</span>. Everything else is optional — detectors that lack data are skipped
            rather than guessed.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {CSV_COLUMNS.map((c) => (
              <code key={c} className="rounded-md bg-surface px-2 py-1 text-xs text-muted-foreground">
                {c}
              </code>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

import { useEffect, useState } from "react";
import type { ScreeningRun, StockAnalysis } from "@/types";

export default function HistoryPage() {
  const [runs, setRuns] = useState<ScreeningRun[]>([]);
  const [selected, setSelected] = useState<ScreeningRun | null>(null);
  const [stocks, setStocks] = useState<StockAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((d) => { setRuns(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function selectRun(run: ScreeningRun) {
    setSelected(run);
    const res = await fetch(`/api/runs/${run.id}/stocks`);
    setStocks(await res.json());
  }

  const statusColor: Record<string, string> = {
    completed: "var(--pass)",
    running: "var(--warn)",
    failed: "var(--reject)",
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1" style={{ color: "var(--text)" }}>
        Screening History
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
        Full audit trail — every run logged, every rejection explained.
      </p>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
      ) : runs.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>No runs yet. Trigger a screen from the dashboard.</p>
      ) : (
        <div className="grid grid-cols-[280px_1fr] gap-6">
          {/* Run list */}
          <div className="flex flex-col gap-2">
            {runs.map((run) => (
              <button
                key={run.id}
                onClick={() => selectRun(run)}
                className="text-left rounded-sm border p-4 transition-colors"
                style={{
                  backgroundColor: selected?.id === run.id ? "var(--surface2)" : "var(--surface)",
                  borderColor: selected?.id === run.id ? "var(--accent)" : "var(--border)",
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-xs font-bold" style={{ color: "var(--text)" }}>Run #{run.id}</span>
                  <span
                    className="font-mono text-xs font-semibold flex items-center gap-1.5"
                    style={{ color: statusColor[run.status] ?? "var(--muted)" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: statusColor[run.status] }} />
                    {run.status}
                  </span>
                </div>
                <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
                  {new Date(run.triggered_at).toLocaleString()}
                </p>
                <div className="flex gap-4">
                  <Stat label="Scanned" value={run.total_screened} />
                  <Stat label="Quant" value={run.quant_survivors} />
                  <Stat label="Passed" value={run.final_passes} color="var(--pass)" />
                </div>
                {run.error && <p className="text-xs mt-2" style={{ color: "var(--reject)" }}>{run.error}</p>}
              </button>
            ))}
          </div>

          {/* Detail */}
          <div>
            {selected ? (
              <>
                <p className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
                  Run #{selected.id} — {stocks.length} stocks analyzed
                </p>
                <div
                  className="rounded-sm border overflow-hidden"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
                >
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr style={{ backgroundColor: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                        {["Ticker", "Sector", "Price", "Yield", "P/E", "D/E", "Quant", "LLM", "Rejection Reason"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stocks.map((s, i) => (
                        <tr
                          key={s.id}
                          style={{ borderBottom: i < stocks.length - 1 ? "1px solid var(--border)" : "none" }}
                        >
                          <td className="px-4 py-3 font-mono font-bold text-sm" style={{ color: s.passes_moat ? "var(--pass)" : "var(--reject)" }}>
                            {s.ticker}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>{s.sector || "—"}</td>
                          <td className="px-4 py-3 font-mono tabular-nums text-xs" style={{ color: "var(--text)" }}>
                            {s.current_price > 0 ? `$${s.current_price.toFixed(2)}` : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono tabular-nums text-xs" style={{ color: "var(--text)" }}>
                            {s.dividend_yield > 0 ? `${(s.dividend_yield * 100).toFixed(2)}%` : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono tabular-nums text-xs" style={{ color: "var(--text)" }}>
                            {s.pe_ratio > 0 ? `${s.pe_ratio.toFixed(1)}×` : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono tabular-nums text-xs" style={{ color: "var(--text)" }}>
                            {s.debt_to_equity > 0 ? s.debt_to_equity.toFixed(2) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <VerdictChip pass={s.passes_quant} />
                          </td>
                          <td className="px-4 py-3">
                            <VerdictChip pass={s.passes_moat} />
                          </td>
                          <td className="px-4 py-3 max-w-xs text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                            {s.moat?.primary_disruption_risk ?? s.rejection_reason ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="pt-16 text-center text-sm" style={{ color: "var(--muted)" }}>
                Select a run to inspect its analysis.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <span className="text-xs">
      <span style={{ color: "var(--muted)" }}>{label}: </span>
      <span className="font-mono font-semibold tabular-nums" style={{ color: color ?? "var(--text)" }}>{value}</span>
    </span>
  );
}

function VerdictChip({ pass }: { pass: boolean }) {
  return (
    <span
      className="font-mono text-xs font-bold px-1.5 py-0.5 rounded-sm"
      style={{
        color: pass ? "var(--pass)" : "var(--reject)",
        backgroundColor: `color-mix(in srgb, ${pass ? "var(--pass)" : "var(--reject)"} 12%, transparent)`,
      }}
    >
      {pass ? "✓" : "✗"}
    </span>
  );
}

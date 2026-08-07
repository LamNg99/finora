import { useEffect, useRef, useState } from "react";
import type {
  RunLogEntry,
  RunStatus,
  ScreeningRun,
  StockAnalysis,
} from "@/types";

const POLL_MS = 2000;

export default function HistoryPage() {
  const [runs, setRuns] = useState<ScreeningRun[]>([]);
  const [selected, setSelected] = useState<ScreeningRun | null>(null);
  const [stocks, setStocks] = useState<StockAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<RunStatus | null>(null);
  const wasRunning = useRef(false);

  async function fetchRuns() {
    const res = await fetch("/api/runs").catch(() => null);
    if (res?.ok) setRuns(await res.json());
  }

  useEffect(() => {
    fetchRuns().finally(() => setLoading(false));
  }, []);

  // Poll /status every 2s
  useEffect(() => {
    let alive = true;
    async function poll() {
      if (!alive) return;
      const res = await fetch("/api/status").catch(() => null);
      if (res?.ok) {
        const s: RunStatus = await res.json();
        setStatus(s);
        // Refresh run list when a run finishes
        if (wasRunning.current && !s.running) fetchRuns();
        wasRunning.current = s.running;
      }
      setTimeout(poll, POLL_MS);
    }
    poll();
    return () => {
      alive = false;
    };
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
      <h1
        className="text-2xl font-semibold tracking-tight mb-1"
        style={{ color: "var(--text)" }}
      >
        Screening History
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Full audit trail — every run logged, every rejection explained.
      </p>

      {status?.running && <LiveRunPanel status={status} />}

      {loading ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Loading…
        </p>
      ) : runs.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No runs yet. Trigger a screen from the dashboard.
        </p>
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
                  backgroundColor:
                    selected?.id === run.id
                      ? "var(--surface2)"
                      : "var(--surface)",
                  borderColor:
                    selected?.id === run.id ? "var(--accent)" : "var(--border)",
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-xs font-bold"
                      style={{ color: "var(--text)" }}
                    >
                      Run #{run.id}
                    </span>
                    <span
                      className="font-mono text-xs px-1.5 py-0.5 rounded-sm"
                      style={{
                        color:
                          run.trigger === "manual"
                            ? "var(--accent)"
                            : "var(--muted)",
                        backgroundColor:
                          run.trigger === "manual"
                            ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                            : "color-mix(in srgb, var(--muted) 10%, transparent)",
                        border: `1px solid ${run.trigger === "manual" ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--border)"}`,
                      }}
                    >
                      {run.trigger}
                    </span>
                  </div>
                  <span
                    className="font-mono text-xs font-semibold flex items-center gap-1.5"
                    style={{ color: statusColor[run.status] ?? "var(--muted)" }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: statusColor[run.status] }}
                    />
                    {run.status}
                  </span>
                </div>
                <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
                  {new Date(run.triggered_at).toLocaleString()}
                </p>
                <div className="flex gap-4">
                  <Stat label="Scanned" value={run.total_screened} />
                  <Stat label="Quant" value={run.quant_survivors} />
                  <Stat
                    label="Passed"
                    value={run.final_passes}
                    color="var(--pass)"
                  />
                </div>
                {run.error && (
                  <p
                    className="text-xs mt-2"
                    style={{ color: "var(--reject)" }}
                  >
                    {run.error}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Detail */}
          <div>
            {selected ? (
              <>
                <p
                  className="text-sm font-semibold mb-4"
                  style={{ color: "var(--text)" }}
                >
                  Run #{selected.id} — {stocks.length} stocks analyzed
                </p>
                <div
                  className="rounded-sm border overflow-hidden"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface)",
                  }}
                >
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr
                        style={{
                          backgroundColor: "var(--surface2)",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {[
                          "Ticker",
                          "Sector",
                          "Price",
                          "Yield",
                          "P/E",
                          "D/E",
                          "Quant",
                          "LLM",
                          "Rejection Reason",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left text-xs font-mono font-semibold uppercase tracking-widest"
                            style={{ color: "var(--muted)" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stocks.map((s, i) => (
                        <tr
                          key={s.id}
                          style={{
                            borderBottom:
                              i < stocks.length - 1
                                ? "1px solid var(--border)"
                                : "none",
                          }}
                        >
                          <td
                            className="px-4 py-3 font-mono font-bold text-sm"
                            style={{
                              color: s.passes_moat
                                ? "var(--pass)"
                                : "var(--reject)",
                            }}
                          >
                            {s.ticker}
                          </td>
                          <td
                            className="px-4 py-3 text-xs"
                            style={{ color: "var(--muted)" }}
                          >
                            {s.sector || "—"}
                          </td>
                          <td
                            className="px-4 py-3 font-mono tabular-nums text-xs"
                            style={{ color: "var(--text)" }}
                          >
                            {s.current_price > 0
                              ? `$${s.current_price.toFixed(2)}`
                              : "—"}
                          </td>
                          <td
                            className="px-4 py-3 font-mono tabular-nums text-xs"
                            style={{ color: "var(--text)" }}
                          >
                            {s.dividend_yield > 0
                              ? `${(s.dividend_yield * 100).toFixed(2)}%`
                              : "—"}
                          </td>
                          <td
                            className="px-4 py-3 font-mono tabular-nums text-xs"
                            style={{ color: "var(--text)" }}
                          >
                            {s.pe_ratio > 0 ? `${s.pe_ratio.toFixed(1)}×` : "—"}
                          </td>
                          <td
                            className="px-4 py-3 font-mono tabular-nums text-xs"
                            style={{ color: "var(--text)" }}
                          >
                            {s.debt_to_equity > 0
                              ? s.debt_to_equity.toFixed(2)
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <VerdictChip pass={s.passes_quant} />
                          </td>
                          <td className="px-4 py-3">
                            <VerdictChip pass={s.passes_moat} />
                          </td>
                          <td
                            className="px-4 py-3 max-w-xs text-xs leading-relaxed"
                            style={{ color: "var(--muted)" }}
                          >
                            {s.moat?.primary_disruption_risk ??
                              s.rejection_reason ??
                              "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div
                className="pt-16 text-center text-sm"
                style={{ color: "var(--muted)" }}
              >
                Select a run to inspect its analysis.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LiveRunPanel({ status }: { status: RunStatus }) {
  const pct = status.total > 0 ? (status.processed / status.total) * 100 : 0;
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [status.log.length]);

  return (
    <div
      className="rounded-sm border mb-6 overflow-hidden"
      style={{
        borderColor: "var(--accent)",
        backgroundColor: "var(--surface)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--accent) 8%, var(--surface2))",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: "var(--accent)" }}
          />
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--text)" }}
          >
            Run #{status.run_id} — Live
          </span>
        </div>
        <span
          className="font-mono text-xs tabular-nums"
          style={{ color: "var(--muted)" }}
        >
          {status.processed} / {status.total} analyzed
        </span>
      </div>

      <div className="px-4 pt-3 pb-4">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex-1 rounded-full overflow-hidden"
            style={{ height: 4, backgroundColor: "var(--border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: "var(--accent)" }}
            />
          </div>
          <span
            className="font-mono text-xs tabular-nums shrink-0"
            style={{ color: "var(--muted)", minWidth: "3ch" }}
          >
            {Math.round(pct)}%
          </span>
        </div>

        <div className="flex items-start gap-6">
          {/* Stats */}
          <div className="flex gap-5 shrink-0">
            <StatPill
              label="Passed"
              value={status.passed}
              color="var(--pass)"
            />
            <StatPill
              label="Failed"
              value={status.failed}
              color="var(--reject)"
            />
            {status.current_ticker && (
              <div>
                <p
                  className="text-xs font-mono uppercase tracking-widest mb-0.5"
                  style={{ color: "var(--muted)" }}
                >
                  Analyzing
                </p>
                <p
                  className="text-sm font-mono font-bold"
                  style={{ color: "var(--accent)" }}
                >
                  {status.current_ticker}
                </p>
              </div>
            )}
          </div>

          {/* Log feed */}
          {status.log.length > 0 && (
            <div
              ref={logRef}
              className="flex-1 overflow-y-auto"
              style={{ maxHeight: 100 }}
            >
              {[...status.log].reverse().map((entry, i) => (
                <LogEntry key={i} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LogEntry({ entry }: { entry: RunLogEntry }) {
  const color =
    entry.verdict === "PASS"
      ? "var(--pass)"
      : entry.verdict === "NO_FILING"
        ? "var(--warn)"
        : "var(--reject)";
  const icon =
    entry.verdict === "PASS" ? "✓" : entry.verdict === "NO_FILING" ? "—" : "✗";
  const label =
    entry.verdict === "QUANT_REJECT" ? "quant" : entry.bypass ? "bypass" : null;

  return (
    <div className="flex items-baseline gap-2 text-xs py-0.5">
      <span
        className="font-mono font-bold w-3 shrink-0 text-center"
        style={{ color }}
      >
        {icon}
      </span>
      <span
        className="font-mono font-bold shrink-0"
        style={{ color: "var(--text)" }}
      >
        {entry.ticker}
      </span>
      {label && (
        <span
          className="font-mono text-xs px-1 rounded-sm"
          style={{
            color: "var(--accent)",
            backgroundColor:
              "color-mix(in srgb, var(--accent) 12%, transparent)",
          }}
        >
          {label}
        </span>
      )}
      {entry.reason && (
        <span className="truncate" style={{ color: "var(--muted)" }}>
          {entry.reason}
        </span>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <p
        className="text-xs font-mono uppercase tracking-widest mb-0.5"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </p>
      <p
        className="text-lg font-mono font-bold tabular-nums leading-none"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <span className="text-xs">
      <span style={{ color: "var(--muted)" }}>{label}: </span>
      <span
        className="font-mono font-semibold tabular-nums"
        style={{ color: color ?? "var(--text)" }}
      >
        {value}
      </span>
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

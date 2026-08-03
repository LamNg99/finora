import type { ScreeningRun } from "@/types";

interface KPIProps {
  run: ScreeningRun | null;
  loading: boolean;
}

export default function KPISection({ run, loading }: KPIProps) {
  const date = run
    ? new Date(run.triggered_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <KPICard
        label="Last Scan"
        metric={loading ? "—" : date}
        sub={run ? `${run.trigger === "cron" ? "Automated trigger" : "Manual trigger"}` : "No runs yet"}
        accentColor="var(--accent)"
      />
      <KPICard
        label="Equities Scanned"
        metric={loading ? "—" : (run?.total_screened ?? 0).toString()}
        sub="via FMP stable API"
        accentColor="var(--muted)"
      />
      <KPICard
        label="Math Baseline"
        metric={loading ? "—" : (run?.quant_survivors ?? 0).toString()}
        sub="Passed P/E · Yield · FCF · D/E"
        accentColor="var(--warn)"
      />
      <KPICard
        label="Fortress Assets"
        metric={loading ? "—" : (run?.final_passes ?? 0).toString()}
        sub="Moat confirmed by LLM"
        accentColor="var(--pass)"
      />
    </div>
  );
}

function KPICard({
  label,
  metric,
  sub,
  accentColor,
}: {
  label: string;
  metric: string;
  sub: string;
  accentColor: string;
}) {
  return (
    <div
      className="rounded-sm p-5 flex flex-col gap-2"
      style={{
        backgroundColor: "var(--surface)",
        borderTop: `2px solid ${accentColor}`,
        border: `1px solid var(--border)`,
        borderTopColor: accentColor,
      }}
    >
      <span
        className="text-xs font-mono font-semibold uppercase tracking-widest"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </span>
      <span
        className="text-3xl font-mono font-bold tabular-nums leading-none"
        style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
      >
        {metric}
      </span>
      <span className="text-xs" style={{ color: "var(--muted)" }}>
        {sub}
      </span>
    </div>
  );
}

import { useEffect, useState } from "react";
import type { ScreeningRun, StockAnalysis } from "@/types";
import KPISection from "@/components/KPISection";
import AIInbox from "@/components/AIInbox";
import RejectionLog from "@/components/RejectionLog";
import WatchlistSection from "@/components/WatchlistSection";

export default function FortressPage() {
  const [latestRun, setLatestRun] = useState<ScreeningRun | null>(null);
  const [stocks, setStocks] = useState<StockAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [runsRes, stocksRes] = await Promise.all([
        fetch("/api/runs?limit=1"),
        fetch("/api/stocks"),
      ]);
      const runs: ScreeningRun[] = await runsRes.json();
      setLatestRun(runs[0] ?? null);
      setStocks(await stocksRes.json());
    } catch (_) {}
    setLoading(false);
  }

  async function triggerScreen() {
    setTriggering(true);
    try {
      await fetch("/api/trigger", { method: "POST" });
      // Poll after a delay to catch the completed run
      setTimeout(async () => {
        await load();
        setTriggering(false);
      }, 8000);
    } catch (_) {
      setTriggering(false);
    }
  }

  const passed = stocks.filter((s) => s.passes_moat && !s.quant_bypass);
  const rejected = stocks.filter((s) => s.passes_quant && !s.passes_moat);
  const watchlist = stocks.filter((s) => s.quant_bypass);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1" style={{ color: "var(--text)" }}>
            Screening Dashboard
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Automated value screener — quantitative baseline · LLM moat analysis · zero-noise output
          </p>
        </div>
        <button
          onClick={triggerScreen}
          disabled={triggering}
          className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: "var(--accent)",
            color: "#fff",
          }}
        >
          {triggering ? (
            <>
              <Spinner />
              Running…
            </>
          ) : (
            "Run Screen Now"
          )}
        </button>
      </div>

      {/* 1 — KPI Cards */}
      <KPISection run={latestRun} loading={loading} />

      {/* Divider with label */}
      <SectionDivider label="AI Inbox — Fortress Assets" />

      {/* 2 — AI Inbox */}
      <AIInbox stocks={passed} />

      {/* 3 — Watchlist (bypass stocks — LLM only) */}
      {watchlist.length > 0 && (
        <>
          <SectionDivider label="Watchlist — LLM Only" />
          <WatchlistSection stocks={watchlist} />
        </>
      )}

      {/* 4 — Rejection Log */}
      <SectionDivider label="Rejection Log" />
      <RejectionLog stocks={rejected} />
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

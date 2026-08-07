import { useEffect, useState } from "react";
import type { ScreeningRun, StockAnalysis } from "@/types";
import KPISection from "@/components/KPISection";
import AIInbox from "@/components/AIInbox";
import RejectionLog from "@/components/RejectionLog";
import WatchlistSection from "@/components/WatchlistSection";
import TriggerDialog from "@/components/TriggerDialog";

type Tab = "inbox" | "watchlist" | "rejections";

export default function FortressPage() {
  const [latestRun, setLatestRun] = useState<ScreeningRun | null>(null);
  const [stocks, setStocks] = useState<StockAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("inbox");

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
    } catch {
      // network errors are silently swallowed; UI stays in last-known state
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // load is stable (defined once per render); exhaustive-deps would require
    // useCallback wrapping, which is out of scope for this fix.
  }, []);

  function onScreenStarted() {
    setTriggering(true);
    setTimeout(async () => {
      await load();
      setTriggering(false);
    }, 8000);
  }

  const passed = stocks.filter((s) => s.passes_moat && !s.quant_bypass);
  const rejected = stocks.filter((s) => !s.passes_moat && !s.quant_bypass);
  const watchlist = stocks.filter((s) => s.quant_bypass);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "inbox", label: "AI Inbox", count: passed.length },
    { id: "watchlist", label: "Watchlist", count: watchlist.length },
    { id: "rejections", label: "Rejections", count: rejected.length },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight mb-1"
            style={{ color: "var(--text)" }}
          >
            Screening Dashboard
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Automated value screener — quantitative baseline · LLM moat analysis
            · zero-noise output
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          disabled={triggering}
          className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          {triggering ? (
            <>
              <Spinner />
              Running…
            </>
          ) : (
            "Analyze Stocks"
          )}
        </button>
      </div>

      {/* KPI Cards */}
      <KPISection run={latestRun} loading={loading} />

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 mb-6 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative"
              style={{ color: active ? "var(--accent)" : "var(--muted)" }}
            >
              {t.label}
              <span
                className="font-mono text-xs font-bold px-1.5 py-0.5 rounded-sm"
                style={{
                  color: active ? "var(--accent)" : "var(--muted)",
                  backgroundColor: `color-mix(in srgb, ${active ? "var(--accent)" : "var(--muted)"} 12%, transparent)`,
                }}
              >
                {t.count}
              </span>
              {active && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: "var(--accent)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      {tab === "inbox" && <AIInbox stocks={passed} />}
      {tab === "watchlist" && (
        <WatchlistSection stocks={watchlist.length > 0 ? watchlist : []} />
      )}
      {tab === "rejections" && <RejectionLog stocks={rejected} />}

      {dialogOpen && (
        <TriggerDialog
          onClose={() => setDialogOpen(false)}
          onStarted={onScreenStarted}
        />
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

import { useEffect, useRef, useState } from "react";
import { SUPPORTED_TICKERS } from "../data/tickers";

interface Props {
  onClose: () => void;
  onStarted: () => void;
}

export default function TriggerDialog({ onClose, onStarted }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    searchRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const filtered = SUPPORTED_TICKERS.filter((t) => {
    const q = search.trim().toUpperCase();
    if (!q) return true;
    return t.ticker.includes(q) || t.name.toUpperCase().includes(q) || t.sector.toUpperCase().includes(q);
  });

  function toggle(ticker: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }

  function removeSelected(ticker: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(ticker);
      return next;
    });
  }

  async function handleSubmit() {
    if (!selected.size) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(apiKey ? { "X-API-Key": apiKey } : {}) },
        body: JSON.stringify({ tickers: Array.from(selected) }),
      });
      if (res.status === 403) { setSubmitError("Invalid API key."); setSubmitting(false); return; }
      if (!res.ok) { setSubmitError("Failed to start screen."); setSubmitting(false); return; }
      onStarted();
      onClose();
    } catch {
      setSubmitError("Network error.");
      setSubmitting(false);
    }
  }

  const count = selected.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative rounded-sm border w-full flex flex-col"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", maxWidth: 540, maxHeight: "90dvh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Analyze Stocks</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Select tickers to analyze.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center" style={{ color: "var(--muted)" }}>
            <CloseIcon />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4 overflow-hidden min-h-0">
          {/* API key */}
          <div className="shrink-0">
            <label className="block text-xs font-mono font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--muted)" }}>
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your trigger API key…"
              className="w-full text-sm px-3 py-2 rounded-sm border outline-none"
              style={{ backgroundColor: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </div>

          {/* Selected chips */}
          {count > 0 && (
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {Array.from(selected).map((ticker) => (
                <span
                  key={ticker}
                  className="flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-sm"
                  style={{
                    color: "var(--accent)",
                    backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                  }}
                >
                  {ticker}
                  <button
                    onClick={() => removeSelected(ticker)}
                    className="opacity-60 hover:opacity-100 leading-none ml-0.5"
                    style={{ color: "var(--accent)" }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search + list */}
          <div className="flex flex-col min-h-0 flex-1">
            <label className="block text-xs font-mono font-semibold uppercase tracking-widest mb-1.5 shrink-0" style={{ color: "var(--muted)" }}>
              Tickers
            </label>
            <div className="relative shrink-0">
              <SearchIcon />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ticker, name, or sector…"
                className="w-full text-sm pl-8 pr-3 py-2 rounded-sm border outline-none"
                style={{ backgroundColor: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>
            <div
              className="mt-2 rounded-sm border overflow-y-auto flex-1"
              style={{ borderColor: "var(--border)", minHeight: 180, maxHeight: 260 }}
            >
              {filtered.length === 0 ? (
                <p className="text-xs px-3 py-3" style={{ color: "var(--muted)" }}>No tickers match your search.</p>
              ) : (
                filtered.map((t, i) => {
                  const isSelected = selected.has(t.ticker);
                  return (
                    <button
                      key={t.ticker}
                      onClick={() => toggle(t.ticker)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs text-left transition-colors"
                      style={{
                        borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                        backgroundColor: isSelected
                          ? "color-mix(in srgb, var(--accent) 8%, var(--surface))"
                          : "var(--surface)",
                        color: "var(--text)",
                      }}
                    >
                      <span
                        className="w-4 h-4 shrink-0 rounded-sm border flex items-center justify-center"
                        style={{
                          borderColor: isSelected ? "var(--accent)" : "var(--border)",
                          backgroundColor: isSelected ? "var(--accent)" : "transparent",
                          color: "#fff",
                        }}
                      >
                        {isSelected && <CheckIcon />}
                      </span>
                      <span className="font-mono font-bold w-14 shrink-0" style={{ color: isSelected ? "var(--accent)" : "var(--text)" }}>
                        {t.ticker}
                      </span>
                      <span className="truncate" style={{ color: "var(--muted)" }}>{t.name}</span>
                      <span className="ml-auto shrink-0 text-xs" style={{ color: "var(--muted)", opacity: 0.6 }}>{t.sector}</span>
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-xs mt-1.5 shrink-0" style={{ color: "var(--muted)" }}>
              {count === 0 ? "No tickers selected." : `${count} ticker${count === 1 ? "" : "s"} selected.`}
            </p>
          </div>

          {submitError && (
            <p className="text-xs font-semibold shrink-0" style={{ color: "var(--reject)" }}>{submitError}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1 shrink-0">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-sm border"
              style={{ color: "var(--muted)", borderColor: "var(--border)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={count === 0 || submitting}
              className="text-sm font-semibold px-4 py-2 rounded-sm transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              {submitting ? "Starting…" : `Run ${count > 0 ? `${count} ` : ""}${count === 1 ? "Ticker" : "Tickers"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
      style={{ color: "var(--muted)" }}
    >
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

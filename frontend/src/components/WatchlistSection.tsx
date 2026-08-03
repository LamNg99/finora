import { useState, useMemo } from "react";
import type { StockAnalysis } from "@/types";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function WatchlistSection({ stocks }: { stocks: StockAnalysis[] }) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  function setFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  const filtered = useMemo(() => stocks.filter((s) => {
    if (search && !s.ticker.toLowerCase().includes(search.toLowerCase()) &&
        !s.company_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.ai && (filters.ai === "PASS") !== s.passes_moat) return false;
    if (filters.moat && s.moat?.competitive_moat !== filters.moat) return false;
    return true;
  }), [stocks, filters, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (stocks.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Watchlist</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            No FMP ratio data — LLM moat analysis only. Quant metrics not evaluated.
          </p>
        </div>
        <span
          className="font-mono text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}
        >
          {filtered.length !== stocks.length ? `${filtered.length} / ${stocks.length}` : stocks.length}{" "}
          {stocks.length === 1 ? "Stock" : "Stocks"}
        </span>
      </div>

      <div className="rounded-sm border overflow-hidden" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
        <FilterBar
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search ticker or company…"
          active={filters}
          onChange={setFilter}
          groups={[
            { key: "ai", label: "AI", options: [
              { label: "PASS", value: "PASS" },
              { label: "FAIL", value: "FAIL" },
            ]},
            { key: "moat", label: "Moat", options: [
              { label: "WIDE", value: "WIDE" },
              { label: "NARROW", value: "NARROW" },
              { label: "NONE", value: "NONE" },
            ]},
          ]}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <Th>Ticker</Th>
                <Th>Company</Th>
                <Th align="right">Price</Th>
                <Th align="right">Fair Value</Th>
                <Th align="right">MoS</Th>
                <Th>Moat Thesis</Th>
                <Th align="center">Moat</Th>
                <Th align="center">AI</Th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: "var(--muted)" }}>No results match the current filters.</td></tr>
              ) : paged.map((s, i) => (
                <WatchRow key={s.id} stock={s} last={i === paged.length - 1} />
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </section>
  );
}

function WatchRow({ stock, last }: { stock: StockAnalysis; last: boolean }) {
  const moat = stock.moat;
  const val = stock.valuation;

  return (
    <tr style={{ borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <td className="px-4 py-3.5 font-mono font-bold text-sm" style={{ color: "var(--accent)" }}>
        {stock.ticker}
        <span className="block text-xs mt-0.5 tabular-nums font-normal" style={{ color: "var(--muted)" }}>
          {fmtDate(stock.analyzed_at)}
        </span>
      </td>
      <td className="px-4 py-3.5 text-sm" style={{ color: "var(--text)" }}>
        {stock.company_name}
        {stock.sector && (
          <span className="block text-xs mt-0.5" style={{ color: "var(--muted)" }}>{stock.sector}</span>
        )}
      </td>
      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-sm" style={{ color: "var(--text)" }}>
        {stock.current_price > 0 ? `$${stock.current_price.toFixed(2)}` : "—"}
      </td>
      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-sm" style={{ color: "var(--text)" }}>
        {val?.avg_fair_value ? `$${val.avg_fair_value.toFixed(2)}` : "—"}
      </td>
      <td className="px-4 py-3.5 text-right">
        {val?.margin_of_safety != null ? <MosBadge mos={val.margin_of_safety} verdict={val.verdict} /> : <span style={{ color: "var(--muted)" }}>—</span>}
      </td>
      <td className="px-4 py-3.5 max-w-xs">
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--muted)" }}>
          {moat?.thesis_summary ?? "—"}
        </p>
      </td>
      <td className="px-4 py-3.5 text-center">
        {moat ? <MoatBadge moat={moat.competitive_moat} /> : <span style={{ color: "var(--muted)" }}>—</span>}
      </td>
      <td className="px-4 py-3.5 text-center">
        <span
          className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm"
          style={{
            color: stock.passes_moat ? "var(--pass)" : "var(--reject)",
            backgroundColor: `color-mix(in srgb, ${stock.passes_moat ? "var(--pass)" : "var(--reject)"} 12%, transparent)`,
          }}
        >
          {stock.passes_moat ? "✓ PASS" : "✗ FAIL"}
        </span>
      </td>
    </tr>
  );
}

function MosBadge({ mos, verdict }: { mos: number; verdict: string }) {
  const color =
    verdict === "UNDERVALUED" ? "var(--pass)"
    : verdict === "FAIR" ? "var(--warn)"
    : "var(--reject)";
  const sign = mos >= 0 ? "+" : "";
  return (
    <span
      className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm tabular-nums"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {sign}{mos.toFixed(1)}%
    </span>
  );
}

function MoatBadge({ moat }: { moat: "WIDE" | "NARROW" | "NONE" }) {
  const colors: Record<string, string> = { WIDE: "var(--pass)", NARROW: "var(--warn)", NONE: "var(--reject)" };
  const color = colors[moat] ?? "var(--muted)";
  return (
    <span
      className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {moat}
    </span>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  return (
    <th
      className="px-4 py-2.5 text-xs font-mono font-semibold uppercase tracking-widest"
      style={{ color: "var(--muted)", textAlign: align, backgroundColor: "var(--surface2)", whiteSpace: "nowrap" }}
    >
      {children}
    </th>
  );
}

import { useState, useMemo } from "react";
import type { StockAnalysis, Valuation } from "@/types";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AIInbox({ stocks }: { stocks: StockAnalysis[] }) {
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const sectors = useMemo(() =>
    [...new Set(stocks.map((s) => s.sector).filter(Boolean))].sort(),
    [stocks]
  );

  function setFilter(key: string, values: string[]) {
    setFilters((f) => ({ ...f, [key]: values }));
    setPage(1);
  }

  const filtered = useMemo(() => {
    return stocks.filter((s) => {
      if (search && !s.ticker.toLowerCase().includes(search.toLowerCase()) &&
          !s.company_name.toLowerCase().includes(search.toLowerCase())) return false;
      const moatF = filters.moat ?? [];
      if (moatF.length > 0 && !moatF.includes(s.moat?.competitive_moat ?? "")) return false;
      const verdictF = filters.verdict ?? [];
      if (verdictF.length > 0 && !verdictF.includes(s.valuation?.verdict ?? "")) return false;
      const sectorF = filters.sector ?? [];
      if (sectorF.length > 0 && !sectorF.includes(s.sector)) return false;
      return true;
    });
  }, [stocks, filters, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>AI Inbox</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            Equities that cleared both the quantitative baseline and the LLM moat analysis.
          </p>
        </div>
        <span
          className="font-mono text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ backgroundColor: "color-mix(in srgb, var(--pass) 12%, transparent)", color: "var(--pass)" }}
        >
          {filtered.length !== stocks.length ? `${filtered.length} / ${stocks.length}` : stocks.length} Fortress {stocks.length === 1 ? "Asset" : "Assets"}
        </span>
      </div>

      {stocks.length === 0 ? (
        <div className="rounded-sm border p-12 text-center" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No stocks have cleared every filter yet. Run a screen to populate this inbox.
          </p>
        </div>
      ) : (
        <div className="rounded-sm border overflow-hidden" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <FilterBar
            search={search}
            onSearch={(v) => { setSearch(v); setPage(1); }}
            searchPlaceholder="Search ticker or company…"
            active={filters}
            onChange={setFilter}

            groups={[
              { key: "moat", label: "Moat", options: [
                { label: "WIDE", value: "WIDE" },
                { label: "NARROW", value: "NARROW" },
              ]},
              { key: "verdict", label: "Valuation", options: [
                { label: "Undervalued", value: "UNDERVALUED" },
                { label: "Fair", value: "FAIR" },
                { label: "Overvalued", value: "OVERVALUED" },
              ]},
              ...(sectors.length > 1 ? [{
                key: "sector", label: "Sector", dropdown: true,
                options: sectors.map((s) => ({ label: s, value: s })),
              }] : []),
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
                  <Th align="right">Div Yield</Th>
                  <Th align="right">D/E</Th>
                  <Th>AI Moat Thesis</Th>
                  <Th align="center">Sentiment</Th>
                  <Th align="center">Moat</Th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-sm" style={{ color: "var(--muted)" }}>No results match the current filters.</td></tr>
                ) : paged.map((s, i) => (
                  <InboxRow key={s.id} stock={s} last={i === paged.length - 1} />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      )}
    </section>
  );
}

function InboxRow({ stock, last }: { stock: StockAnalysis; last: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const moat = stock.moat;
  const score = moat?.management_sentiment_score ?? null;

  return (
    <>
      <tr
        className="transition-colors cursor-pointer"
        style={{
          borderBottom: last && !expanded ? "none" : "1px solid var(--border)",
          backgroundColor: expanded ? "var(--surface2)" : undefined,
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3.5 align-top">
          <span className="font-mono font-bold text-sm tracking-tight" style={{ color: "var(--pass)" }}>
            {stock.ticker}
          </span>
          <span className="block text-xs mt-0.5 font-mono tabular-nums" style={{ color: "var(--muted)" }}>
            {fmtDate(stock.analyzed_at)}
          </span>
        </td>
        <td className="px-4 py-3.5 align-top">
          <span style={{ color: "var(--text)" }}>{stock.company_name}</span>
          {stock.sector && (
            <span className="block text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {stock.sector}
            </span>
          )}
        </td>
        <td className="px-4 py-3.5 align-top text-right font-mono tabular-nums" style={{ color: "var(--text)" }}>
          {stock.current_price > 0 ? `$${stock.current_price.toFixed(2)}` : "—"}
        </td>
        <td className="px-4 py-3.5 align-top text-right font-mono tabular-nums" style={{ color: "var(--text)" }}>
          {stock.valuation?.avg_fair_value ? `$${stock.valuation.avg_fair_value.toFixed(2)}` : "—"}
        </td>
        <td className="px-4 py-3.5 align-top text-right">
          {stock.valuation?.margin_of_safety != null ? <MosBadge valuation={stock.valuation} /> : <span style={{ color: "var(--muted)" }}>—</span>}
        </td>
        <td className="px-4 py-3.5 align-top text-right font-mono tabular-nums" style={{ color: "var(--text)" }}>
          {stock.dividend_yield > 0 ? `${(stock.dividend_yield * 100).toFixed(2)}%` : "—"}
        </td>
        <td className="px-4 py-3.5 align-top text-right font-mono tabular-nums" style={{ color: "var(--text)" }}>
          {stock.debt_to_equity > 0 ? stock.debt_to_equity.toFixed(2) : "—"}
        </td>
        <td className="px-4 py-3.5 align-top max-w-xs">
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--muted)" }}>
            {moat?.thesis_summary ?? "—"}
          </p>
        </td>
        <td className="px-4 py-3.5 align-top text-center">
          {score !== null ? <SentimentBadge score={score} /> : "—"}
        </td>
        <td className="px-4 py-3.5 align-top text-center">
          {moat && <MoatBadge moat={moat.competitive_moat} />}
        </td>
      </tr>

      {expanded && moat && (
        <tr style={{ borderBottom: last ? "none" : "1px solid var(--border)", backgroundColor: "var(--surface2)" }}>
          <td colSpan={10} className="px-4 pb-5 pt-1">
            <ExpandedThesis moat={moat} stock={stock} />
          </td>
        </tr>
      )}
    </>
  );
}

function ExpandedThesis({ moat, stock }: { moat: NonNullable<StockAnalysis["moat"]>; stock: StockAnalysis }) {
  return (
    <div className="grid grid-cols-3 gap-6 pt-2">
      <div className="col-span-2">
        <p className="text-xs font-mono font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
          Full Thesis
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          {moat.thesis_summary}
        </p>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {moat.green_flags.length > 0 && (
            <SignalCol title="Signals" items={moat.green_flags} color="var(--pass)" icon="+" />
          )}
          {moat.red_flags.length > 0 && (
            <SignalCol title="Risks" items={moat.red_flags} color="var(--reject)" icon="−" />
          )}
        </div>
      </div>
      <div className="space-y-3 pt-0.5">
        <MetaPair label="Price at Scan" value={stock.current_price > 0 ? `$${stock.current_price.toFixed(2)}` : "—"} />
        <MetaPair label="P/E" value={stock.pe_ratio > 0 ? `${stock.pe_ratio.toFixed(1)}×` : "—"} />
        <MetaPair label="FCF / Share" value={stock.fcf_per_share > 0 ? `$${stock.fcf_per_share.toFixed(2)}` : "—"} />
        {stock.valuation && <ValuationBreakdown val={stock.valuation} />}
        <MetaPair label="Moat Sources" value={moat.moat_sources.join(", ") || "—"} />
        <MetaPair label="Management" value={moat.management_quality} />
        <MetaPair label="Dividend" value={moat.dividend_sustainability} />
        <MetaPair label="Confidence" value={moat.confidence} />
        <MetaPair label="LLM Model" value={stock.llm_model ?? "—"} />
      </div>
    </div>
  );
}

function SignalCol({ title, items, color, icon }: { title: string; items: string[]; color: string; icon: string }) {
  return (
    <div>
      <p className="text-xs font-mono font-semibold uppercase tracking-widest mb-1.5" style={{ color }}>
        {title}
      </p>
      {items.slice(0, 3).map((item, i) => (
        <div key={i} className="flex gap-1.5 text-xs mb-1" style={{ color: "var(--muted)" }}>
          <span style={{ color, flexShrink: 0 }}>{icon}</span>
          {item}
        </div>
      ))}
    </div>
  );
}

function MetaPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--text)" }}>{value}</p>
    </div>
  );
}

function SentimentBadge({ score }: { score: number }) {
  const color = score >= 8 ? "var(--pass)" : score >= 5 ? "var(--warn)" : "var(--reject)";
  return (
    <span
      className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm tabular-nums"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {score}/10
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

function MosBadge({ valuation }: { valuation: Valuation }) {
  const mos = valuation.margin_of_safety;
  const color =
    valuation.verdict === "UNDERVALUED" ? "var(--pass)"
    : valuation.verdict === "FAIR" ? "var(--warn)"
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

function ValuationBreakdown({ val }: { val: Valuation }) {
  const rows: [string, string][] = [
    ["Avg Fair Value", `$${val.avg_fair_value.toFixed(2)}`],
    ...(val.dcf_value !== undefined ? [["DCF", `$${val.dcf_value.toFixed(2)}${val.dcf_cagr !== undefined ? ` (${val.dcf_cagr > 0 ? "+" : ""}${val.dcf_cagr}% CAGR)` : ""}`] as [string, string]] : []),
    ...(val.pfcf_value !== undefined ? [["P/FCF ×20", `$${val.pfcf_value.toFixed(2)}`] as [string, string]] : []),
    ...(val.graham_value !== undefined ? [["Graham №", `$${val.graham_value.toFixed(2)}`] as [string, string]] : []),
  ];
  return (
    <div className="pt-1 pb-0.5 border-t border-b my-2" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--muted)" }}>Valuation</p>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between text-xs mb-0.5">
          <span style={{ color: "var(--muted)" }}>{label}</span>
          <span className="font-mono tabular-nums" style={{ color: "var(--text)" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

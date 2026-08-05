import { useState, useMemo } from "react";
import type { StockAnalysis, Valuation } from "@/types";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function RejectionLog({ stocks }: { stocks: StockAnalysis[] }) {
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

  const filtered = useMemo(() => stocks.filter((s) => {
    if (search && !s.ticker.toLowerCase().includes(search.toLowerCase()) &&
        !s.company_name.toLowerCase().includes(search.toLowerCase())) return false;
    const sectorF = filters.sector ?? [];
    if (sectorF.length > 0 && !sectorF.includes(s.sector)) return false;
    const verdictF = filters.verdict ?? [];
    if (verdictF.length > 0 && !verdictF.includes(s.valuation?.verdict ?? "")) return false;
    const reasonF = filters.reason ?? [];
    if (reasonF.includes("quant") && s.passes_quant) return false;
    if (reasonF.includes("ai") && !s.passes_quant) return false;
    return true;
  }), [stocks, filters, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Rejections</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            Failed quant filter or LLM moat analysis. Click AI-analyzed rows to expand.
          </p>
        </div>
        <span
          className="font-mono text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ backgroundColor: "color-mix(in srgb, var(--reject) 12%, transparent)", color: "var(--reject)" }}
        >
          {filtered.length !== stocks.length ? `${filtered.length} / ${stocks.length}` : stocks.length}{" "}
          {stocks.length === 1 ? "Rejection" : "Rejections"}
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
            { key: "reason", label: "Rejected by", options: [
              { label: "Quant", value: "quant" },
              { label: "AI", value: "ai" },
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
                <Th>Math</Th>
                <Th>AI Decision</Th>
                <Th>Primary Disruption Risk</Th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
                    {stocks.length === 0 ? "No rejections yet." : "No results match the current filters."}
                  </td>
                </tr>
              ) : paged.map((s, i) => (
                <RejectionRow key={s.id} stock={s} last={i === paged.length - 1} />
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </section>
  );
}

function VerdictChip({ pass, label }: { pass: boolean; label: string }) {
  const color = pass ? "var(--pass)" : "var(--reject)";
  return (
    <span
      className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {label}
    </span>
  );
}

function RejectionRow({ stock, last }: { stock: StockAnalysis; last: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const moat = stock.moat;
  const hasAiDetail = stock.passes_quant && moat != null;

  const risk = stock.passes_quant
    ? (moat?.primary_disruption_risk ?? stock.rejection_reason ?? "—")
    : (stock.rejection_reason ?? "Failed quant filter");

  return (
    <>
      <tr
        style={{
          borderBottom: last && !expanded ? "none" : "1px solid var(--border)",
          backgroundColor: expanded ? "var(--surface2)" : undefined,
          cursor: hasAiDetail ? "pointer" : undefined,
        }}
        onClick={hasAiDetail ? () => setExpanded((v) => !v) : undefined}
      >
        <td className="px-4 py-3.5 font-mono font-bold text-sm" style={{ color: "var(--reject)" }}>
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
          {stock.valuation?.avg_fair_value ? `$${stock.valuation.avg_fair_value.toFixed(2)}` : "—"}
        </td>
        <td className="px-4 py-3.5 text-right">
          {stock.valuation?.margin_of_safety != null
            ? <MosBadge mos={stock.valuation.margin_of_safety} verdict={stock.valuation.verdict} />
            : <span style={{ color: "var(--muted)" }}>—</span>}
        </td>
        <td className="px-4 py-3.5 text-right font-mono tabular-nums text-sm" style={{ color: "var(--text)" }}>
          {stock.dividend_yield > 0 ? `${(stock.dividend_yield * 100).toFixed(2)}%` : "—"}
        </td>
        <td className="px-4 py-3.5">
          <VerdictChip pass={stock.passes_quant} label={stock.passes_quant ? "✓ PASS" : "✗ FAIL"} />
        </td>
        <td className="px-4 py-3.5">
          {stock.passes_quant ? (
            <div>
              <VerdictChip pass={false} label="✗ FAILED" />
              {moat && (
                <span className="block text-xs mt-1" style={{ color: "var(--muted)" }}>
                  {moat.competitive_moat} moat · {moat.confidence} confidence
                </span>
              )}
            </div>
          ) : (
            <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>—</span>
          )}
        </td>
        <td className="px-4 py-3.5 max-w-sm text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          {risk}
        </td>
      </tr>

      {expanded && hasAiDetail && (
        <tr style={{ borderBottom: last ? "none" : "1px solid var(--border)", backgroundColor: "var(--surface2)" }}>
          <td colSpan={9} className="px-4 pb-5 pt-1">
            <RejectionDetail moat={moat!} stock={stock} />
          </td>
        </tr>
      )}
    </>
  );
}

function RejectionDetail({ moat, stock }: { moat: NonNullable<StockAnalysis["moat"]>; stock: StockAnalysis }) {
  const score = moat.management_sentiment_score;
  const scoreColor = score >= 8 ? "var(--pass)" : score >= 5 ? "var(--warn)" : "var(--reject)";
  const moatColor: Record<string, string> = { WIDE: "var(--pass)", NARROW: "var(--warn)", NONE: "var(--reject)" };

  return (
    <div className="grid grid-cols-3 gap-6 pt-2">
      <div className="col-span-2">
        <p className="text-xs font-mono font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--reject)" }}>
          AI Rejection Reason
        </p>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text)" }}>
          {moat.rejection_reason ?? stock.rejection_reason ?? "No reason provided."}
        </p>
        <div className="grid grid-cols-2 gap-4">
          {moat.red_flags.length > 0 && (
            <div>
              <p className="text-xs font-mono font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--reject)" }}>Red Flags</p>
              {moat.red_flags.map((f, i) => (
                <div key={i} className="flex gap-1.5 text-xs mb-1" style={{ color: "var(--muted)" }}>
                  <span style={{ color: "var(--reject)", flexShrink: 0 }}>−</span>{f}
                </div>
              ))}
            </div>
          )}
          {moat.green_flags.length > 0 && (
            <div>
              <p className="text-xs font-mono font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--pass)" }}>Green Flags</p>
              {moat.green_flags.map((f, i) => (
                <div key={i} className="flex gap-1.5 text-xs mb-1" style={{ color: "var(--muted)" }}>
                  <span style={{ color: "var(--pass)", flexShrink: 0 }}>+</span>{f}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-3 pt-0.5">
        <DetailMeta label="Moat Rating" value={
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm" style={{ color: moatColor[moat.competitive_moat] ?? "var(--muted)", backgroundColor: `color-mix(in srgb, ${moatColor[moat.competitive_moat] ?? "var(--muted)"} 12%, transparent)` }}>
            {moat.competitive_moat}
          </span>
        } />
        <DetailMeta label="Management Sentiment" value={
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm" style={{ color: scoreColor, backgroundColor: `color-mix(in srgb, ${scoreColor} 12%, transparent)` }}>
            {score}/10
          </span>
        } />
        <DetailMeta label="Management Quality" value={<span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{moat.management_quality}</span>} />
        <DetailMeta label="Dividend" value={<span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{moat.dividend_sustainability}</span>} />
        <DetailMeta label="Confidence" value={<span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{moat.confidence}</span>} />
        {moat.moat_sources.length > 0 && (
          <DetailMeta label="Moat Sources" value={<span className="text-xs" style={{ color: "var(--muted)" }}>{moat.moat_sources.join(", ")}</span>} />
        )}
        <DetailMeta label="LLM Model" value={<span className="text-xs" style={{ color: "var(--muted)" }}>{stock.llm_model ?? "—"}</span>} />
      </div>
    </div>
  );
}

function DetailMeta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--muted)" }}>{label}</p>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className="px-4 py-2.5 text-xs font-mono font-semibold uppercase tracking-widest"
      style={{
        color: "var(--muted)",
        textAlign: align,
        backgroundColor: "var(--surface2)",
        whiteSpace: "nowrap",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </th>
  );
}

function MosBadge({ mos, verdict }: { mos: number; verdict: Valuation["verdict"] }) {
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

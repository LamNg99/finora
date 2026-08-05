import { useState, useMemo } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import type { StockAnalysis, Valuation } from "@/types";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function RejectionLog({ stocks }: { stocks: StockAnalysis[] }) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const sectors = useMemo(() =>
    [...new Set(stocks.map((s) => s.sector).filter(Boolean))].sort(),
    [stocks]
  );

  function setFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  const filtered = useMemo(() => stocks.filter((s) => {
    if (search && !s.ticker.toLowerCase().includes(search.toLowerCase()) &&
        !s.company_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.sector && s.sector !== filters.sector) return false;
    if (filters.verdict && s.valuation?.verdict !== filters.verdict) return false;
    return true;
  }), [stocks, filters, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const count = stocks.length;

  return (
    <Accordion.Root type="single" collapsible defaultValue={count > 0 ? "log" : undefined}>
      <Accordion.Item value="log">
        <Accordion.Trigger
          className="w-full flex items-center justify-between px-5 py-3.5 rounded-sm border transition-colors group"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Rejection Log</span>
            <span
              className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm"
              style={{ color: "var(--reject)", backgroundColor: "color-mix(in srgb, var(--reject) 12%, transparent)" }}
            >
              {count} {count === 1 ? "Rejection" : "Rejections"}
            </span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>Failed quant filter or LLM moat analysis</span>
          </div>
          <ChevronIcon />
        </Accordion.Trigger>

        <Accordion.Content className="accordion-content">
          {count === 0 ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--muted)" }}>No rejections yet.</div>
          ) : (
            <div className="border-x border-b rounded-b-sm overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <FilterBar
                search={search}
                onSearch={(v) => { setSearch(v); setPage(1); }}
                searchPlaceholder="Search ticker or company…"
                active={filters}
                onChange={setFilter}
                groups={[
                  { key: "verdict", label: "Valuation", options: [
                    { label: "Undervalued", value: "UNDERVALUED" },
                    { label: "Fair", value: "FAIR" },
                    { label: "Overvalued", value: "OVERVALUED" },
                  ]},
                  ...(sectors.length > 1 ? [{
                    key: "sector", label: "Sector",
                    options: sectors.map((s) => ({ label: s, value: s })),
                  }] : []),
                ]}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <RTh>Ticker</RTh>
                      <RTh>Company</RTh>
                      <RTh align="right">Price</RTh>
                      <RTh align="right">Fair Value</RTh>
                      <RTh align="right">MoS</RTh>
                      <RTh align="right">Div Yield</RTh>
                      <RTh>Math</RTh>
                      <RTh>AI Decision</RTh>
                      <RTh>Primary Disruption Risk</RTh>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-sm" style={{ color: "var(--muted)" }}>No results match the current filters.</td></tr>
                    ) : paged.map((s, i) => (
                      <RejectionRow key={s.id} stock={s} last={i === paged.length - 1} />
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
            </div>
          )}
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
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
          backgroundColor: expanded ? "var(--surface2)" : "var(--surface)",
          cursor: hasAiDetail ? "pointer" : undefined,
        }}
        onClick={hasAiDetail ? () => setExpanded((v) => !v) : undefined}
      >
        <td className="px-4 py-3 font-mono font-bold text-sm" style={{ color: "var(--reject)" }}>
          {stock.ticker}
          <span className="block text-xs mt-0.5 tabular-nums font-normal" style={{ color: "var(--muted)" }}>
            {fmtDate(stock.analyzed_at)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm" style={{ color: "var(--text)" }}>
          {stock.company_name}
          {stock.sector && (
            <span className="block text-xs" style={{ color: "var(--muted)" }}>{stock.sector}</span>
          )}
        </td>
        <td className="px-4 py-3 text-right font-mono tabular-nums text-sm" style={{ color: "var(--text)" }}>
          {stock.current_price > 0 ? `$${stock.current_price.toFixed(2)}` : "—"}
        </td>
        <td className="px-4 py-3 text-right font-mono tabular-nums text-sm" style={{ color: "var(--text)" }}>
          {stock.valuation?.avg_fair_value ? `$${stock.valuation.avg_fair_value.toFixed(2)}` : "—"}
        </td>
        <td className="px-4 py-3 text-right">
          {stock.valuation?.margin_of_safety != null ? <RejMosBadge mos={stock.valuation.margin_of_safety} verdict={stock.valuation.verdict} /> : <span style={{ color: "var(--muted)" }}>—</span>}
        </td>
        <td className="px-4 py-3 text-right font-mono tabular-nums text-sm" style={{ color: "var(--text)" }}>
          {stock.dividend_yield > 0 ? `${(stock.dividend_yield * 100).toFixed(2)}%` : "—"}
        </td>
        <td className="px-4 py-3">
          <VerdictChip pass={stock.passes_quant} label={stock.passes_quant ? "✓ PASS" : "✗ FAIL"} />
        </td>
        <td className="px-4 py-3">
          {stock.passes_quant ? (
            <div>
              <VerdictChip pass={false} label="✗ FAILED" />
              {moat && (
                <span className="block text-xs mt-1" style={{ color: "var(--muted)" }}>
                  {moat.competitive_moat} moat · {moat.confidence} confidence
                  {hasAiDetail && (
                    <span className="ml-1" style={{ color: "var(--accent)" }}>
                      {expanded ? "▲" : "▼"}
                    </span>
                  )}
                </span>
              )}
            </div>
          ) : (
            <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>—</span>
          )}
        </td>
        <td className="px-4 py-3 max-w-sm text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
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

function RTh({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
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

function RejMosBadge({ mos, verdict }: { mos: number; verdict: Valuation["verdict"] }) {
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

function ChevronIcon() {
  return (
    <svg
      className="transition-transform duration-200 group-data-[state=open]:rotate-180"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ color: "var(--muted)", flexShrink: 0 }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

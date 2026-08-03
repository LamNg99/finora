export interface MoatReport {
  passes_moat_filter: boolean;
  competitive_moat: "WIDE" | "NARROW" | "NONE";
  moat_sources: string[];
  management_quality: "EXCELLENT" | "GOOD" | "POOR";
  management_sentiment_score: number;
  dividend_sustainability: "SUSTAINABLE" | "AT_RISK" | "NOT_APPLICABLE";
  red_flags: string[];
  green_flags: string[];
  rejection_reason: string | null;
  thesis_summary: string | null;
  primary_disruption_risk: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface Valuation {
  pfcf_value?: number;
  graham_value?: number;
  dcf_value?: number;
  dcf_cagr?: number;
  avg_fair_value: number;
  margin_of_safety: number;  // % positive = undervalued
  verdict: "UNDERVALUED" | "FAIR" | "OVERVALUED" | "INSUFFICIENT_DATA";
  methods_used: string[];
}

export interface StockAnalysis {
  id: number;
  run_id: number;
  ticker: string;
  company_name: string;
  sector: string;
  current_price: number;
  market_cap: number;
  pe_ratio: number;
  dividend_yield: number;
  debt_to_equity: number;
  fcf_per_share: number;
  passes_quant: boolean;
  quant_bypass: boolean;
  passes_moat: boolean;
  rejection_reason: string | null;
  moat_report: MoatReport | null;
  moat: MoatReport | null;
  valuation: Valuation | null;
  llm_model: string | null;
  analyzed_at: string;
}

export interface ScreeningRun {
  id: number;
  triggered_at: string;
  trigger: string;
  total_screened: number;
  quant_survivors: number;
  final_passes: number;
  status: "running" | "completed" | "failed";
  error: string | null;
}

export interface RunLogEntry {
  ticker: string;
  verdict: "PASS" | "FAIL" | "NO_FILING";
  bypass: boolean;
  reason: string | null;
}

export interface RunStatus {
  running: boolean;
  run_id: number | null;
  current_ticker: string | null;
  processed: number;
  total: number;
  passed: number;
  failed: number;
  log: RunLogEntry[];
}

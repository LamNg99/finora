"""
Three-method fair value estimator:
  1. P/FCF Reversion  — 20× FCF/share
  2. DCF              — 5-yr FCF CAGR, 10-yr projection, terminal value
  3. Graham Number    — √(22.5 × EPS × BVPS)
"""

import math
from app.screener import obb_client

VALUATION_PRESETS: dict[str, dict[str, float]] = {
    "balanced":  {"dcf": 0.334, "pfcf": 0.333, "graham": 0.333},
    "dcf_heavy": {"dcf": 0.60,  "pfcf": 0.25,  "graham": 0.15},
    "graham":    {"dcf": 0.10,  "pfcf": 0.20,  "graham": 0.70},
}

WACC = 0.09
TERMINAL_GROWTH = 0.03
PROJECTION_YEARS = 10
MAX_FCF_GROWTH = 0.20
MIN_FCF_GROWTH = -0.05
FAIR_PFCF_MULTIPLE = 20.0


async def estimate_fair_value(
    ticker: str,
    current_price: float,
    fcf_per_share: float,
    eps: float,
    book_value_per_share: float,
    market_cap: float,
    valuation_preset: str = "balanced",
) -> dict:
    point_estimates: dict[str, float] = {}
    methods_used: list[str] = []

    # ── Method 1: P/FCF Reversion ─────────────────────────────────────────────
    if fcf_per_share > 0:
        point_estimates["pfcf_value"] = round(FAIR_PFCF_MULTIPLE * fcf_per_share, 2)
        methods_used.append("pfcf")

    # ── Method 2: Graham Number ────────────────────────────────────────────────
    if eps > 0 and book_value_per_share > 0:
        point_estimates["graham_value"] = round(math.sqrt(22.5 * eps * book_value_per_share), 2)
        methods_used.append("graham")

    # ── Method 3: DCF ─────────────────────────────────────────────────────────
    try:
        cf_history = await obb_client.get_cash_flow(ticker, limit=5)
        fcfs = [c["free_cash_flow"] for c in cf_history if (c.get("free_cash_flow") or 0) > 0]

        if len(fcfs) >= 2 and current_price > 0 and market_cap > 0:
            shares = market_cap / current_price
            # History is newest-first; CAGR from oldest → newest
            n = len(fcfs) - 1
            cagr = (fcfs[0] / fcfs[-1]) ** (1 / n) - 1
            cagr = max(MIN_FCF_GROWTH, min(cagr, MAX_FCF_GROWTH))

            fcf_base = fcfs[0]
            pv_fcfs = sum(
                fcf_base * (1 + cagr) ** yr / (1 + WACC) ** yr
                for yr in range(1, PROJECTION_YEARS + 1)
            )
            fcf_terminal = fcf_base * (1 + cagr) ** PROJECTION_YEARS
            pv_terminal = (
                fcf_terminal * (1 + TERMINAL_GROWTH) / (WACC - TERMINAL_GROWTH)
            ) / (1 + WACC) ** PROJECTION_YEARS

            point_estimates["dcf_value"] = round((pv_fcfs + pv_terminal) / shares, 2)
            point_estimates["dcf_cagr"] = round(cagr * 100, 1)
            methods_used.append("dcf")
    except Exception:
        pass

    if not methods_used:
        return {"verdict": "INSUFFICIENT_DATA", "methods_used": []}

    weights = VALUATION_PRESETS.get(valuation_preset, VALUATION_PRESETS["balanced"])
    key_map = {"dcf": "dcf_value", "pfcf": "pfcf_value", "graham": "graham_value"}
    total_w = sum(weights.get(m, 0) for m in methods_used)
    if total_w > 0:
        avg = round(sum(point_estimates[key_map[m]] * weights.get(m, 0) / total_w for m in methods_used), 2)
    else:
        values = [point_estimates[key_map[m]] for m in methods_used]
        avg = round(sum(values) / len(values), 2)
    mos = round((avg - current_price) / current_price * 100, 1)  # % positive = cheap

    if mos >= 20:
        verdict = "UNDERVALUED"
    elif mos >= -15:
        verdict = "FAIR"
    else:
        verdict = "OVERVALUED"

    return {
        **point_estimates,
        "avg_fair_value": avg,
        "margin_of_safety": mos,
        "verdict": verdict,
        "methods_used": methods_used,
    }

import asyncio
import logging
import traceback
from app.screener import obb_client

log = logging.getLogger("finora")

THRESHOLDS = {
    "max_pe": 60.0,
    "min_yield": 0.001,
    "max_yield": 0.12,
    "max_dte": 5.0,
    "min_fcf_ps": 0.10,
}


async def run_wide_net() -> tuple[list[dict], list[dict]]:
    """
    Returns (quant_survivors, bypass_candidates).
    bypass_candidates are tickers with no FMP ratio data — sent straight to LLM.
    """
    candidates = await obb_client.screen_equities(market_cap_min=1_000_000_000, limit=300)
    if not candidates:
        return [], []

    sem = asyncio.Semaphore(8)
    survivors: list[dict] = []
    bypassed: list[dict] = []

    async def evaluate(c: dict) -> None:
        ticker = c.get("symbol", "")
        async with sem:
            try:
                m = await obb_client.get_metrics(ticker)
                if not m or all(v is None for v in m.values()):
                    log.info("[WideNet] %s → BYPASS (no FMP ratio data)", ticker)
                    bypassed.append(_build(c, m or {}, bypass=True))
                    return
                ok, reason = _passes(m)
                if ok:
                    log.info("[WideNet] %s → PASS quant", ticker)
                    survivors.append(_build(c, m, bypass=False))
                else:
                    log.info("[WideNet] %s → REJECT (%s)", ticker, reason)
            except Exception as e:
                log.warning("[WideNet] %s → ERROR: %s: %s\n%s", ticker, type(e).__name__, e, traceback.format_exc())

    await asyncio.gather(*[evaluate(c) for c in candidates])
    return survivors, bypassed


def _build(c: dict, m: dict, *, bypass: bool) -> dict:
    return {
        "ticker": c.get("symbol", ""),
        "company_name": c.get("name", ""),
        "sector": c.get("sector", ""),
        "current_price": c.get("price", 0.0) or 0.0,
        "market_cap": c.get("market_cap", 0.0) or 0.0,
        "pe_ratio": m.get("pe_ratio", 0.0) or 0.0,
        "dividend_yield": m.get("dividend_yield", 0.0) or 0.0,
        "debt_to_equity": m.get("debt_to_equity", 0.0) or 0.0,
        "fcf_per_share": m.get("free_cash_flow_per_share", 0.0) or 0.0,
        "eps": m.get("eps", 0.0) or 0.0,
        "book_value_per_share": m.get("book_value_per_share", 0.0) or 0.0,
        "quant_bypass": bypass,
    }


def _passes(m: dict) -> tuple[bool, str]:
    t = THRESHOLDS
    pe = m.get("pe_ratio") or 0
    yield_ = m.get("dividend_yield") or 0
    dte = m.get("debt_to_equity") or 999
    fcf_ps = m.get("free_cash_flow_per_share") or 0

    passes_value = 0 < pe <= t["max_pe"]
    passes_income = t["min_yield"] <= yield_ <= t["max_yield"]
    # A stock with positive FCF/share passes even without a dividend
    passes_fcf_proxy = fcf_ps >= t["min_fcf_ps"]

    if not (passes_value or passes_income or passes_fcf_proxy):
        return False, f"pe={pe:.1f} yield={yield_:.4f} fcf_ps={fcf_ps:.2f} — no value/income/FCF signal"
    if dte > t["max_dte"]:
        return False, f"D/E={dte:.2f} > {t['max_dte']}"
    if fcf_ps < t["min_fcf_ps"]:
        return False, f"FCF/share={fcf_ps:.2f} < {t['min_fcf_ps']}"
    return True, ""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.screener import obb_client
from app.screener.dcf import calculate_dcf

router = APIRouter(prefix="/screen", tags=["screener"])


class QuantVerdict(BaseModel):
    ticker: str
    current_price: float
    pe_ratio: float
    pe_verdict: str
    dividend_yield: float
    yield_verdict: str
    debt_to_equity: float
    fcf_per_share: float
    dcf_intrinsic_value: Optional[float]
    dcf_margin_of_safety: Optional[float]
    dcf_verdict: str
    overall_verdict: str


@router.get("/{symbol}", response_model=QuantVerdict)
async def run_math_filter(symbol: str):
    """
    Quantitative math filter for a single symbol.
    Uses OpenBB → FMP for metrics and cash flow, then runs DCF.
    """
    ticker = symbol.upper()

    metrics = await obb_client.get_metrics(ticker)
    if not metrics:
        raise HTTPException(status_code=404, detail=f"No FMP data for {ticker}")

    profile = await obb_client.get_profile(ticker)
    cash_flows_raw = await obb_client.get_cash_flow(ticker, limit=5)

    current_price: float = profile.get("price", 0.0) or 0.0
    pe_ratio: float = metrics.get("pe_ratio", 0.0) or 0.0
    div_yield: float = metrics.get("dividend_yield", 0.0) or 0.0
    dte: float = metrics.get("debt_to_equity", 0.0) or 0.0
    fcf_ps: float = metrics.get("free_cash_flow_per_share", 0.0) or 0.0

    pe_verdict = _pe_verdict(pe_ratio, metrics)
    yield_verdict = _yield_verdict(div_yield, metrics)

    # DCF
    fcfs = [cf.get("free_cash_flow", 0) or 0 for cf in cash_flows_raw]
    shares = profile.get("shares_outstanding", 0) or 0
    net_debt = metrics.get("net_debt", 0) or 0
    dcf = calculate_dcf(fcfs, current_price, shares, net_debt) if shares else None

    if dcf is None:
        dcf_verdict = "UNKNOWN"
    elif dcf.is_undervalued and dcf.margin_of_safety > 0.15:
        dcf_verdict = "UNDERVALUED"
    elif not dcf.is_undervalued:
        dcf_verdict = "OVERVALUED"
    else:
        dcf_verdict = "FAIR"

    verdicts = [pe_verdict, yield_verdict, dcf_verdict]
    overvalued = verdicts.count("OVERVALUED")
    if overvalued >= 2:
        overall = "REJECT"
    elif overvalued == 1:
        overall = "CAUTION"
    else:
        overall = "PASS"

    return QuantVerdict(
        ticker=ticker,
        current_price=current_price,
        pe_ratio=round(pe_ratio, 2),
        pe_verdict=pe_verdict,
        dividend_yield=round(div_yield, 4),
        yield_verdict=yield_verdict,
        debt_to_equity=round(dte, 2),
        fcf_per_share=round(fcf_ps, 2),
        dcf_intrinsic_value=dcf.intrinsic_value if dcf else None,
        dcf_margin_of_safety=dcf.margin_of_safety if dcf else None,
        dcf_verdict=dcf_verdict,
        overall_verdict=overall,
    )


def _pe_verdict(current_pe: float, _metrics: dict) -> str:
    if current_pe <= 0:
        return "UNKNOWN"
    # FMP metrics endpoint returns multiple periods; use current vs a simple threshold
    # A PE above 25 flags overvalued relative to typical value screens
    if current_pe > 25:
        return "OVERVALUED"
    if current_pe < 12:
        return "UNDERVALUED"
    return "FAIR"


def _yield_verdict(current_yield: float, _metrics: dict) -> str:
    if current_yield == 0:
        return "NO_DIVIDEND"
    if current_yield > 0.12:
        return "OVERVALUED"  # distress signal
    if current_yield >= 0.04:
        return "UNDERVALUED"
    return "FAIR"

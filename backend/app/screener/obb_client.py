"""
FMP API client — uses the stable base URL.
https://financialmodelingprep.com/stable/
Symbol is passed as a query param, not a path segment.
"""

import asyncio
import httpx
from app.core.config import settings

_BASE = "https://financialmodelingprep.com/stable"


def _new_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=30.0, limits=httpx.Limits(max_keepalive_connections=10))

UNIVERSE: list[str] = ["MSFT", "UNH"]


def _p(**kwargs) -> dict:
    return {"apikey": settings.fmp_api_key, **kwargs}


async def screen_equities(
    market_cap_min: float = 1_000_000_000,
    limit: int = 300,
) -> list[dict]:
    async def fetch_one(symbol: str) -> dict | None:
        try:
            async with _new_client() as client:
                r = await client.get(f"{_BASE}/profile", params=_p(symbol=symbol))
            r.raise_for_status()
            data = r.json()
            if not data:
                return None
            p = data[0] if isinstance(data, list) else data
            if p.get("isEtf") or p.get("isFund"):
                return None
            mc = p.get("marketCap") or 0
            if mc and mc < market_cap_min:
                return None
            return {
                "symbol": p.get("symbol", symbol),
                "name": p.get("companyName", ""),
                "sector": p.get("sector", ""),
                "price": p.get("price", 0.0),
                "market_cap": mc,
            }
        except Exception:
            return None

    results = await asyncio.gather(*[fetch_one(s) for s in UNIVERSE])
    return [r for r in results if r is not None][:limit]


async def get_metrics(symbol: str) -> dict:
    async with _new_client() as client:
        r = await client.get(f"{_BASE}/ratios-ttm", params=_p(symbol=symbol))
    if r.status_code in (402, 403):
        return {}
    r.raise_for_status()
    data = r.json()
    if not data:
        return {}
    m = data[0] if isinstance(data, list) else data
    return {
        "pe_ratio": m.get("priceToEarningsRatioTTM"),
        "dividend_yield": m.get("dividendYieldTTM"),
        "debt_to_equity": m.get("debtToEquityRatioTTM"),
        "free_cash_flow_per_share": m.get("freeCashFlowPerShareTTM"),
        "eps": m.get("netIncomePerShareTTM"),
        "book_value_per_share": m.get("bookValuePerShareTTM"),
        "net_debt": None,
    }


async def get_profile(symbol: str) -> dict:
    async with _new_client() as client:
        r = await client.get(f"{_BASE}/profile", params=_p(symbol=symbol))
    r.raise_for_status()
    data = r.json()
    if not data:
        return {}
    p = data[0] if isinstance(data, list) else data
    price = p.get("price") or 0
    market_cap = p.get("marketCap") or 0
    shares = (market_cap / price) if price else None
    return {
        "price": price,
        "shares_outstanding": shares,
        "sector": p.get("sector", ""),
        "name": p.get("companyName", ""),
    }


async def get_cash_flow(symbol: str, limit: int = 5) -> list[dict]:
    async with _new_client() as client:
        r = await client.get(
            f"{_BASE}/cash-flow-statement",
            params=_p(symbol=symbol, limit=limit),
        )
    r.raise_for_status()
    return [{"free_cash_flow": cf.get("freeCashFlow", 0)} for cf in (r.json() or [])]

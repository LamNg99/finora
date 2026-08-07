"""Endpoints for querying the latest per-ticker stock analysis."""

from fastapi import APIRouter

import app.db.database as db
from app.models.models import StockAnalysis

router = APIRouter()


def stock_out(s: StockAnalysis) -> dict:
    """Serialize a StockAnalysis, hoisting moat and valuation to top level."""
    d = s.model_dump()
    if s.moat_report:
        d["moat"] = s.moat_report
    if s.valuation:
        d["valuation"] = s.valuation
    return d


@router.get("/fortress")
async def fortress_stocks() -> list[dict]:
    """Return the latest passing analysis per ticker (fortress assets)."""
    stocks = await db.get_passed_stocks()
    return [stock_out(s) for s in stocks]


@router.get("/stocks")
async def all_stocks(limit: int = 100) -> list[dict]:
    """Return the latest analysis per ticker across all stocks."""
    stocks = await db.get_all_stocks(limit)
    return [stock_out(s) for s in stocks]

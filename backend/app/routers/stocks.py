from fastapi import APIRouter

import app.db.database as db
from app.models.models import StockAnalysis

router = APIRouter()


def stock_out(s: StockAnalysis) -> dict:
    d = s.model_dump()
    if s.moat_report:
        d["moat"] = s.moat_report
    if s.valuation:
        d["valuation"] = s.valuation
    return d


@router.get("/fortress")
async def fortress_stocks():
    stocks = await db.get_passed_stocks()
    return [stock_out(s) for s in stocks]


@router.get("/stocks")
async def all_stocks(limit: int = 100):
    stocks = await db.get_all_stocks(limit)
    return [stock_out(s) for s in stocks]

from fastapi import APIRouter

import app.db.database as db
from app.routers.stocks import stock_out

router = APIRouter()


@router.get("/runs")
async def list_runs(limit: int = 20):
    runs = await db.get_runs(limit)
    return [r.model_dump() for r in runs]


@router.get("/runs/{run_id}/stocks")
async def run_stocks(run_id: int):
    stocks = await db.get_run_stocks(run_id)
    return [stock_out(s) for s in stocks]

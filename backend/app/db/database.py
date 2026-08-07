import asyncio
from collections.abc import Callable
from typing import TypeVar

from sqlalchemy import func
from sqlmodel import Session, SQLModel, create_engine, select

from app.core.config import settings
from app.models.models import ScreeningRun, StockAnalysis, VisitorCount

engine = create_engine(settings.database_url, echo=False)

T = TypeVar("T")


def create_tables() -> None:
    SQLModel.metadata.create_all(engine)


async def _run(fn: Callable[[], T]) -> T:
    return await asyncio.get_event_loop().run_in_executor(None, fn)


async def save_run(run: ScreeningRun) -> ScreeningRun:
    def _save() -> ScreeningRun:
        with Session(engine) as s:
            s.add(run)
            s.commit()
            s.refresh(run)
            return run
    return await _run(_save)


async def update_run(run_id: int, **kwargs: object) -> None:
    def _update() -> None:
        with Session(engine) as s:
            run = s.get(ScreeningRun, run_id)
            if run:
                for k, v in kwargs.items():
                    setattr(run, k, v)
                s.add(run)
                s.commit()
    await _run(_update)


async def save_analysis(analysis: StockAnalysis) -> StockAnalysis:
    def _save() -> StockAnalysis:
        with Session(engine) as s:
            s.add(analysis)
            s.commit()
            s.refresh(analysis)
            return analysis
    return await _run(_save)


async def get_all_stocks(limit: int = 100) -> list[StockAnalysis]:
    """Latest analysis per ticker only."""
    def _get() -> list[StockAnalysis]:
        with Session(engine) as s:
            # Subquery: max analyzed_at per ticker
            latest = (
                select(
                    StockAnalysis.ticker,
                    func.max(StockAnalysis.analyzed_at).label("latest_at"),
                )
                .group_by(StockAnalysis.ticker)
                .subquery()
            )
            rows = s.exec(
                select(StockAnalysis)
                .join(
                    latest,
                    (StockAnalysis.ticker == latest.c.ticker)
                    & (StockAnalysis.analyzed_at == latest.c.latest_at),
                )
                .order_by(StockAnalysis.analyzed_at.desc())
                .limit(limit),
            ).all()
            return list(rows)
    return await _run(_get)


async def get_passed_stocks() -> list[StockAnalysis]:
    """Latest analysis per ticker, passed only."""
    def _get() -> list[StockAnalysis]:
        with Session(engine) as s:
            latest = (
                select(
                    StockAnalysis.ticker,
                    func.max(StockAnalysis.analyzed_at).label("latest_at"),
                )
                .group_by(StockAnalysis.ticker)
                .subquery()
            )
            rows = s.exec(
                select(StockAnalysis)
                .join(
                    latest,
                    (StockAnalysis.ticker == latest.c.ticker)
                    & (StockAnalysis.analyzed_at == latest.c.latest_at),
                )
                .where(StockAnalysis.passes_moat)
                .order_by(StockAnalysis.analyzed_at.desc()),
            ).all()
            return list(rows)
    return await _run(_get)


async def get_runs(limit: int = 20) -> list[ScreeningRun]:
    def _get() -> list[ScreeningRun]:
        with Session(engine) as s:
            return list(s.exec(
                select(ScreeningRun)
                .order_by(ScreeningRun.triggered_at.desc())
                .limit(limit),
            ).all())
    return await _run(_get)


async def get_run_stocks(run_id: int) -> list[StockAnalysis]:
    def _get() -> list[StockAnalysis]:
        with Session(engine) as s:
            return list(s.exec(
                select(StockAnalysis)
                .where(StockAnalysis.run_id == run_id)
                .order_by(StockAnalysis.passes_moat.desc()),
            ).all())
    return await _run(_get)


async def increment_visits() -> int:
    def _inc() -> int:
        with Session(engine) as s:
            row = s.get(VisitorCount, 1)
            if row is None:
                row = VisitorCount(id=1, total=1)
            else:
                row.total += 1
            s.add(row)
            s.commit()
            s.refresh(row)
            return row.total
    return await _run(_inc)


async def get_total_visits() -> int:
    def _get() -> int:
        with Session(engine) as s:
            row = s.get(VisitorCount, 1)
            return row.total if row else 0
    return await _run(_get)

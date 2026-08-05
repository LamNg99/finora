import asyncio
from datetime import datetime, timezone
from sqlmodel import SQLModel, create_engine, Session, select
from app.models.models import VisitorCount, ScreeningRun, StockAnalysis
from app.core.config import settings

engine = create_engine(settings.database_url, echo=False)


def create_tables() -> None:
    SQLModel.metadata.create_all(engine)


async def _run(fn):
    return await asyncio.get_event_loop().run_in_executor(None, fn)


async def save_run(run: ScreeningRun) -> ScreeningRun:
    def _save():
        with Session(engine) as s:
            s.add(run)
            s.commit()
            s.refresh(run)
            return run
    return await _run(_save)


async def update_run(run_id: int, **kwargs) -> None:
    def _update():
        with Session(engine) as s:
            run = s.get(ScreeningRun, run_id)
            if run:
                for k, v in kwargs.items():
                    setattr(run, k, v)
                s.add(run)
                s.commit()
    await _run(_update)


async def save_analysis(analysis: StockAnalysis) -> StockAnalysis:
    def _save():
        with Session(engine) as s:
            s.add(analysis)
            s.commit()
            s.refresh(analysis)
            return analysis
    return await _run(_save)


async def get_all_stocks(limit: int = 100) -> list[StockAnalysis]:
    """Latest analysis per ticker only."""
    def _get():
        with Session(engine) as s:
            # Subquery: max analyzed_at per ticker
            from sqlalchemy import func
            latest = (
                select(StockAnalysis.ticker, func.max(StockAnalysis.analyzed_at).label("latest_at"))
                .group_by(StockAnalysis.ticker)
                .subquery()
            )
            rows = s.exec(
                select(StockAnalysis)
                .join(latest, (StockAnalysis.ticker == latest.c.ticker) &
                              (StockAnalysis.analyzed_at == latest.c.latest_at))
                .order_by(StockAnalysis.analyzed_at.desc())
                .limit(limit)
            ).all()
            return list(rows)
    return await _run(_get)


async def get_passed_stocks() -> list[StockAnalysis]:
    """Latest analysis per ticker, passed only."""
    def _get():
        with Session(engine) as s:
            from sqlalchemy import func
            latest = (
                select(StockAnalysis.ticker, func.max(StockAnalysis.analyzed_at).label("latest_at"))
                .group_by(StockAnalysis.ticker)
                .subquery()
            )
            rows = s.exec(
                select(StockAnalysis)
                .join(latest, (StockAnalysis.ticker == latest.c.ticker) &
                              (StockAnalysis.analyzed_at == latest.c.latest_at))
                .where(StockAnalysis.passes_moat == True)
                .order_by(StockAnalysis.analyzed_at.desc())
            ).all()
            return list(rows)
    return await _run(_get)


async def get_runs(limit: int = 20) -> list[ScreeningRun]:
    def _get():
        with Session(engine) as s:
            return list(s.exec(
                select(ScreeningRun)
                .order_by(ScreeningRun.triggered_at.desc())
                .limit(limit)
            ).all())
    return await _run(_get)


async def get_run_stocks(run_id: int) -> list[StockAnalysis]:
    def _get():
        with Session(engine) as s:
            return list(s.exec(
                select(StockAnalysis)
                .where(StockAnalysis.run_id == run_id)
                .order_by(StockAnalysis.passes_moat.desc())
            ).all())
    return await _run(_get)


async def increment_visits() -> int:
    def _inc():
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
    def _get():
        with Session(engine) as s:
            row = s.get(VisitorCount, 1)
            return row.total if row else 0
    return await _run(_get)

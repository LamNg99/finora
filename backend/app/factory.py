from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.db.database as db
from app.core.config import settings
from app.routers import health, trigger, runs, stocks
from app.screener.sec_client import SECClient

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("finora")

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.pipeline import run_screen

    db.create_tables()
    app.state.sec = SECClient()

    scheduler.add_job(
        run_screen,
        "cron",
        args=[app],
        day_of_week=settings.cron_day_of_week,
        hour=settings.cron_hour,
        minute=settings.cron_minute,
        id="weekly_screen",
    )
    scheduler.start()
    log.info(
        "Finora ready. Cron: %s at %02d:%02d.",
        settings.cron_day_of_week,
        settings.cron_hour,
        settings.cron_minute,
    )

    yield

    scheduler.shutdown(wait=False)
    await app.state.sec.close()


def create_app() -> FastAPI:
    app = FastAPI(title="Finora", version="2.0.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(trigger.router)
    app.include_router(runs.router)
    app.include_router(stocks.router)

    return app

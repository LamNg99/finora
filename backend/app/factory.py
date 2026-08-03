from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import RedirectResponse, Response

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
    app = FastAPI(
        title="Finora",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )

    allowed_hosts = ["finoraquant.com", "www.finoraquant.com", "localhost", "127.0.0.1"]
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://finoraquant.com", "http://localhost:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def block_browser_navigation(request: Request, call_next):
        if request.method == "OPTIONS" or request.url.path == "/health":
            return await call_next(request)
        # Direct browser navigation sends Accept: text/html — redirect to SPA
        if request.headers.get("accept", "").startswith("text/html"):
            return RedirectResponse(url="/", status_code=302)
        return await call_next(request)

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    app.include_router(health.router)
    app.include_router(trigger.router)
    app.include_router(runs.router)
    app.include_router(stocks.router)

    return app

from __future__ import annotations

import asyncio
import logging

import httpx
from fastapi import FastAPI

import app.db.database as db
from app.core.config import settings
from app.models.models import ScreeningRun, StockAnalysis
from app.screener.llm_analyzer import analyze_moat
from app.screener.valuation import estimate_fair_value
from app.screener.wide_net import run_wide_net

log = logging.getLogger("finora")

_screen_lock = asyncio.Lock()


async def run_screen(app: FastAPI) -> None:
    if _screen_lock.locked():
        log.warning("Screen already running, skipping.")
        return

    async with _screen_lock:
        run = await db.save_run(ScreeningRun(trigger="cron"))
        log.info("[Run %d] Starting full screen.", run.id)
        try:
            from app.screener.obb_client import UNIVERSE
            survivors, bypassed = await run_wide_net()
            await db.update_run(run.id, quant_survivors=len(survivors), total_screened=len(UNIVERSE))
            log.info("[Run %d] Quant survivors: %d, bypass: %d.", run.id, len(survivors), len(bypassed))

            final_passes = 0
            for stock in survivors + bypassed:
                analysis = await _analyze_one(run.id, stock, app)
                if analysis.passes_moat:
                    final_passes += 1

            await db.update_run(run.id, final_passes=final_passes, status="completed")
            log.info("[Run %d] Done — %d fortress assets.", run.id, final_passes)

            if final_passes > 0:
                await _notify(run.id, final_passes)

        except Exception as e:
            log.error("[Run %d] Failed: %s", run.id, e)
            await db.update_run(run.id, status="failed", error=str(e))


async def _analyze_one(run_id: int, stock: dict, app: FastAPI) -> StockAnalysis:
    ticker = stock["ticker"]
    bypass = stock.get("quant_bypass", False)
    analysis = StockAnalysis(
        run_id=run_id,
        ticker=ticker,
        company_name=stock.get("company_name", ""),
        sector=stock.get("sector", ""),
        current_price=stock.get("current_price", 0.0),
        market_cap=stock.get("market_cap", 0.0),
        pe_ratio=stock.get("pe_ratio", 0.0),
        dividend_yield=stock.get("dividend_yield", 0.0),
        debt_to_equity=stock.get("debt_to_equity", 0.0),
        fcf_per_share=stock.get("fcf_per_share", 0.0),
        passes_quant=not bypass,
        quant_bypass=bypass,
    )

    try:
        analysis.valuation = await estimate_fair_value(
            ticker=ticker,
            current_price=stock.get("current_price", 0.0),
            fcf_per_share=stock.get("fcf_per_share", 0.0),
            eps=stock.get("eps", 0.0),
            book_value_per_share=stock.get("book_value_per_share", 0.0),
            market_cap=stock.get("market_cap", 0.0),
        )
    except Exception as e:
        log.warning("[Run %d] Valuation failed for %s: %s", run_id, ticker, e)

    sec = getattr(app.state, "sec", None)
    filing_text = await sec.get_10k_text(ticker) if sec else None
    if not filing_text:
        analysis.rejection_reason = "No 10-K available on SEC EDGAR"
        return await db.save_analysis(analysis)

    try:
        report = await analyze_moat(
            ticker=ticker,
            company_name=stock.get("company_name", ""),
            sector=stock.get("sector", ""),
            current_price=stock.get("current_price", 0.0),
            pe_ratio=stock.get("pe_ratio", 0.0),
            dividend_yield=stock.get("dividend_yield", 0.0),
            filing_text=filing_text,
        )
        analysis.passes_moat = report.passes_moat_filter
        analysis.rejection_reason = report.rejection_reason
        analysis.moat_report = report.model_dump()
        analysis.llm_model = settings.model
    except Exception as e:
        analysis.rejection_reason = f"LLM error: {e}"

    return await db.save_analysis(analysis)


async def _notify(run_id: int, count: int) -> None:
    msg = f"[Finora] {count} New Fortress Asset{'s' if count > 1 else ''} Identified — Run #{run_id}"
    log.info("ALERT: %s", msg)
    if settings.webhook_url:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(settings.webhook_url, json={"text": msg}, timeout=10)
        except Exception as e:
            log.warning("Webhook failed: %s", e)

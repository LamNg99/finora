from __future__ import annotations

import asyncio
import contextlib
import logging
from typing import TYPE_CHECKING

import httpx

import app.db.database as db
from app.core.config import settings
from app.models.models import ScreeningRun, StockAnalysis
from app.screener.llm_analyzer import analyze_moat
from app.screener.obb_client import UNIVERSE
from app.screener.sedar_client import CANADIAN_TICKERS
from app.screener.valuation import estimate_fair_value
from app.screener.wide_net import run_wide_net

if TYPE_CHECKING:
    from fastapi import FastAPI

log = logging.getLogger("finora")

_screen_lock = asyncio.Lock()

_status: dict = {
    "running": False,
    "run_id": None,
    "current_ticker": None,
    "processed": 0,
    "total": 0,
    "passed": 0,
    "failed": 0,
    "log": [],
}


def get_status() -> dict:
    return {**_status, "log": list(_status["log"])}


async def run_screen(  # ruff:ignore[too-many-arguments]
    app: FastAPI,
    tickers: list[str] | None = None,
    model: str | None = None,
    quant_preset: str = "default",
    valuation_preset: str = "balanced",
    trigger: str = "cron",
) -> None:
    if _screen_lock.locked():
        log.warning("Screen already running, skipping.")
        return

    async with _screen_lock:
        run = await db.save_run(ScreeningRun(trigger=trigger))
        # Mutate in place — avoids `global` reassignment
        _status.update({
            "running": True,
            "run_id": run.id,
            "current_ticker": None,
            "processed": 0,
            "total": 0,
            "passed": 0,
            "failed": 0,
        })
        _status["log"] = []
        log.info("[Run %d] Starting full screen.", run.id)
        try:  # ruff:ignore[too-many-statements-in-try-clause]
            effective_universe = tickers or UNIVERSE
            survivors, bypassed, quant_rejected = await run_wide_net(
                tickers=effective_universe, quant_preset=quant_preset,
            )
            await db.update_run(
                run.id,
                quant_survivors=len(survivors),
                total_screened=len(effective_universe),
            )
            log.info(
                "[Run %d] Quant survivors: %d, bypass: %d, rejected: %d.",
                run.id, len(survivors), len(bypassed), len(quant_rejected),
            )

            # Save quant-rejected stocks immediately — no LLM needed
            for stock in quant_rejected:
                rejected_analysis = StockAnalysis(
                    run_id=run.id,
                    ticker=stock["ticker"],
                    company_name=stock.get("company_name", ""),
                    sector=stock.get("sector", ""),
                    current_price=stock.get("current_price", 0.0),
                    market_cap=stock.get("market_cap", 0.0),
                    pe_ratio=stock.get("pe_ratio", 0.0),
                    dividend_yield=stock.get("dividend_yield", 0.0),
                    debt_to_equity=stock.get("debt_to_equity", 0.0),
                    fcf_per_share=stock.get("fcf_per_share", 0.0),
                    passes_quant=False,
                    quant_bypass=False,
                    passes_moat=False,
                    rejection_reason=stock.get(
                        "rejection_reason", "Failed quant filter",
                    ),
                    quant_preset=quant_preset,
                    valuation_preset=valuation_preset,
                )
                with contextlib.suppress(Exception):
                    rejected_analysis.valuation = await estimate_fair_value(
                        ticker=stock["ticker"],
                        current_price=stock.get("current_price", 0.0),
                        fcf_per_share=stock.get("fcf_per_share", 0.0),
                        eps=stock.get("eps", 0.0),
                        book_value_per_share=stock.get(
                            "book_value_per_share", 0.0,
                        ),
                        market_cap=stock.get("market_cap", 0.0),
                        valuation_preset=valuation_preset,
                    )
                await db.save_analysis(rejected_analysis)
                _status["failed"] += 1
                _status["log"].append({
                    "ticker": stock["ticker"],
                    "verdict": "QUANT_REJECT",
                    "bypass": False,
                    "reason": stock.get("rejection_reason"),
                })

            all_stocks = survivors + bypassed
            _status["total"] = len(all_stocks) + len(quant_rejected)
            _status["processed"] = len(quant_rejected)

            final_passes = 0
            for stock in all_stocks:
                _status["current_ticker"] = stock["ticker"]
                analysis = await _analyze_one(
                    run.id, stock, app, model, valuation_preset, quant_preset,
                )

                if (
                    analysis.rejection_reason
                    and "No annual filing" in analysis.rejection_reason
                ):
                    verdict = "NO_FILING"
                elif analysis.passes_moat:
                    verdict = "PASS"
                    _status["passed"] += 1
                    final_passes += 1
                else:
                    verdict = "FAIL"
                    _status["failed"] += 1

                _status["processed"] += 1
                _status["log"].append({
                    "ticker": stock["ticker"],
                    "verdict": verdict,
                    "bypass": stock.get("quant_bypass", False),
                    "reason": analysis.rejection_reason,
                })

            await db.update_run(
                run.id, final_passes=final_passes, status="completed",
            )
            log.info(
                "[Run %d] Done — %d fortress assets.", run.id, final_passes,
            )

            if final_passes > 0:
                await _notify(run.id, final_passes)

        except Exception as e:
            log.exception("[Run %d] Failed.", run.id)
            await db.update_run(run.id, status="failed", error=str(e))
        finally:
            _status["running"] = False
            _status["current_ticker"] = None


async def _analyze_one(  # ruff:ignore[too-many-arguments]
    run_id: int,
    stock: dict,
    app: FastAPI,
    model: str | None = None,
    valuation_preset: str = "balanced",
    quant_preset: str = "default",
) -> StockAnalysis:
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
        quant_preset=quant_preset,
        valuation_preset=valuation_preset,
    )

    try:
        analysis.valuation = await estimate_fair_value(
            ticker=ticker,
            current_price=stock.get("current_price", 0.0),
            fcf_per_share=stock.get("fcf_per_share", 0.0),
            eps=stock.get("eps", 0.0),
            book_value_per_share=stock.get("book_value_per_share", 0.0),
            market_cap=stock.get("market_cap", 0.0),
            valuation_preset=valuation_preset,
        )
    except Exception as e:  # ruff:ignore[blind-except]
        log.warning("[Run %d] Valuation failed for %s: %s", run_id, ticker, e)

    sec = getattr(app.state, "sec", None)
    sedar = getattr(app.state, "sedar", None)
    company_name = stock.get("company_name", "")

    if ticker in CANADIAN_TICKERS:
        # Try SEC first (20-F for cross-listed), fall back to SEDAR+
        filing_text = await sec.get_10k_text(ticker) if sec else None
        if not filing_text and sedar:
            filing_text = await sedar.get_aif_text(ticker, company_name)
    else:
        filing_text = await sec.get_10k_text(ticker) if sec else None

    if not filing_text:
        analysis.rejection_reason = (
            "No annual filing available (SEC EDGAR / SEDAR+)"
        )
        return await db.save_analysis(analysis)

    try:  # ruff:ignore[too-many-statements-in-try-clause]
        effective_model = model or settings.model
        report = await analyze_moat(
            ticker=ticker,
            company_name=stock.get("company_name", ""),
            sector=stock.get("sector", ""),
            current_price=stock.get("current_price", 0.0),
            pe_ratio=stock.get("pe_ratio", 0.0),
            dividend_yield=stock.get("dividend_yield", 0.0),
            filing_text=filing_text,
            model=effective_model,
        )
        analysis.passes_moat = report.passes_moat_filter
        analysis.rejection_reason = report.rejection_reason
        analysis.moat_report = report.model_dump()
        analysis.llm_model = effective_model
    except Exception as e:  # ruff:ignore[blind-except]
        analysis.rejection_reason = f"LLM error: {e}"

    return await db.save_analysis(analysis)


async def _notify(run_id: int, count: int) -> None:
    plural = "s" if count > 1 else ""
    msg = (
        f"[Finora] {count} New Fortress Asset{plural}"
        f" Identified — Run #{run_id}"
    )
    log.info("ALERT: %s", msg)
    if settings.webhook_url:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    settings.webhook_url, json={"text": msg}, timeout=10,
                )
        except Exception as e:  # ruff:ignore[blind-except]
            log.warning("Webhook failed: %s", e)

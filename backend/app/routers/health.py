"""Health-check and live run-status endpoints."""

from fastapi import APIRouter

from app.services.pipeline import get_status

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    """Return service health and the next scheduled cron run time."""
    from app.factory import scheduler  # ruff:ignore[import-outside-top-level]

    job = scheduler.get_job("weekly_screen")
    return {
        "status": "ok",
        "next_run": str(job.next_run_time) if job else None,
    }


@router.get("/status")
async def run_status() -> dict:
    """Return live status of the currently running screen, if any."""
    return get_status()

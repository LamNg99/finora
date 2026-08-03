from fastapi import APIRouter

from app.services.pipeline import get_status

router = APIRouter()


@router.get("/health")
async def health():
    from app.factory import scheduler
    job = scheduler.get_job("weekly_screen")
    return {"status": "ok", "next_run": str(job.next_run_time) if job else None}


@router.get("/status")
async def run_status():
    return get_status()

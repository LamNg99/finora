from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
async def health(request: Request):
    from app.factory import scheduler
    job = scheduler.get_job("weekly_screen")
    return {"status": "ok", "next_run": str(job.next_run_time) if job else None}

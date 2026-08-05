from fastapi import APIRouter
import app.db.database as db

router = APIRouter()


@router.post("/visit", status_code=204)
async def record_visit() -> None:
    await db.increment_visits()


@router.get("/visits")
async def visit_stats() -> dict:
    total = await db.get_total_visits()
    return {"total": total}

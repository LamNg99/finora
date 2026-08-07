"""Visit tracking endpoints."""

from fastapi import APIRouter

import app.db.database as db

router = APIRouter()


@router.post("/visit", status_code=204)
async def record_visit() -> None:
    """Increment the visitor counter."""
    await db.increment_visits()


@router.get("/visits")
async def visit_stats() -> dict:
    """Return total visit count."""
    total = await db.get_total_visits()
    return {"total": total}

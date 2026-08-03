from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request
from pydantic import BaseModel

from app.services.pipeline import run_screen

router = APIRouter()


class TriggerBody(BaseModel):
    tickers: list[str] = []


def _check_key(api_key: Optional[str]) -> None:
    from app.core.config import settings
    if api_key not in settings.trigger_api_key:
        raise HTTPException(status_code=403, detail="Invalid API key")


@router.post("/trigger")
async def manual_trigger(
    request: Request,
    background_tasks: BackgroundTasks,
    body: TriggerBody = TriggerBody(),
    x_api_key: Optional[str] = Header(None),
):
    _check_key(x_api_key)
    tickers = [t.upper().strip() for t in body.tickers if t.strip()] or None
    background_tasks.add_task(run_screen, request.app, tickers)
    return {"status": "started"}

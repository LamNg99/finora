"""Manual-trigger endpoint — starts an on-demand screening run."""
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request
from pydantic import BaseModel

from app.core.config import settings
from app.services.pipeline import run_screen

router = APIRouter()


class TriggerBody(BaseModel):
    """Request body for the /trigger endpoint."""

    tickers: list[str] = []
    model: str | None = None
    quant_preset: str = "default"
    valuation_preset: str = "balanced"


# Module-level default avoids calling TriggerBody() in the function signature.
_DEFAULT_BODY = TriggerBody()


def _check_key(api_key: str | None) -> None:
    if api_key not in settings.trigger_api_key:
        raise HTTPException(status_code=403, detail="Invalid API key")


@router.post("/trigger")
async def manual_trigger(
    request: Request,
    background_tasks: BackgroundTasks,
    body: TriggerBody = _DEFAULT_BODY,
    x_api_key: Annotated[str | None, Header()] = None,
) -> dict:
    """Start an on-demand screening run in the background."""
    _check_key(x_api_key)
    tickers = [t.upper().strip() for t in body.tickers if t.strip()] or None
    background_tasks.add_task(
        run_screen,
        request.app,
        tickers,
        body.model,
        body.quant_preset,
        body.valuation_preset,
        "manual",
    )
    return {"status": "started"}

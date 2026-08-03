from fastapi import APIRouter, BackgroundTasks, Request

from app.services.pipeline import run_screen

router = APIRouter()


@router.post("/trigger")
async def manual_trigger(request: Request, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_screen, request.app)
    return {"status": "started"}

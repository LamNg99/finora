from cx_Freeze import Executable, setup

build_options = {
    "packages": [
        "uvicorn",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "anyio",
        "anyio._backends._asyncio",
        "h11",
        "starlette",
        "fastapi",
        "pydantic",
        "pydantic_settings",
        "httpx",
        "dotenv",
        "sqlmodel",
        "sqlalchemy",
        "sqlalchemy.dialects",
        "sqlalchemy.dialects.sqlite",
        "sqlalchemy.dialects.sqlite.aiosqlite",
        "sqlalchemy.dialects.sqlite.pysqlite",
        "aiosqlite",
        "apscheduler",
        "apscheduler.schedulers.asyncio",
        "apscheduler.triggers.cron",
        "openai",
        "instructor",
        "app",
    ],
    # Keep modules as files (not zipped) so Path(__file__) resolves correctly
    "zip_include_packages": [],
    "zip_exclude_packages": "*",
}

setup(
    name="finora",
    version="1.0.0",
    options={"build_exe": build_options},
    executables=[Executable("main.py", target_name="finora")],
)

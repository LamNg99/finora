from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel, JSON, Column


class VisitorCount(SQLModel, table=True):
    id: int = Field(default=1, primary_key=True)  # single-row counter
    total: int = 0


class ScreeningRun(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    triggered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    trigger: str = "cron"
    total_screened: int = 0
    quant_survivors: int = 0
    final_passes: int = 0
    status: str = "running"
    error: Optional[str] = None


class StockAnalysis(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="screeningrun.id")
    ticker: str
    company_name: str = ""
    sector: str = ""
    current_price: float = 0.0
    market_cap: float = 0.0
    pe_ratio: float = 0.0
    dividend_yield: float = 0.0
    debt_to_equity: float = 0.0
    fcf_per_share: float = 0.0
    passes_quant: bool = False
    quant_bypass: bool = False
    passes_moat: bool = False
    rejection_reason: Optional[str] = None
    moat_report: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    valuation: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    llm_model: Optional[str] = None
    quant_preset: str = "default"
    valuation_preset: str = "balanced"
    analyzed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

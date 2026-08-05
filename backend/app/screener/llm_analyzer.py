from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator
import instructor
from openai import AsyncOpenAI
from app.core.config import settings


class MoatAnalysisReport(BaseModel):
    passes_moat_filter: bool = Field(
        description="True ONLY if the company has a durable competitive moat AND strong management."
    )
    competitive_moat: Literal["WIDE", "NARROW", "NONE"]
    moat_sources: list[str] = Field(
        description="e.g. ['brand pricing power', 'switching costs', 'network effects']"
    )
    management_quality: Literal["EXCELLENT", "GOOD", "POOR"]
    management_sentiment_score: int = Field(
        ge=1, le=10,
        description="1–10 score of management quality and transparency based on 10-K language. 10 = exceptional capital allocators, 1 = destructive or deceptive."
    )
    dividend_sustainability: Literal["SUSTAINABLE", "AT_RISK", "NOT_APPLICABLE"]
    red_flags: list[str]
    green_flags: list[str]
    thesis_summary: Optional[str] = Field(
        None,
        description="Exactly 3 sentences explaining the investment thesis. Required if passes_moat_filter is True."
    )
    primary_disruption_risk: Optional[str] = Field(
        None,
        description="The single clearest risk or structural threat found in the 10-K. Required if passes_moat_filter is False."
    )
    rejection_reason: Optional[str] = Field(
        None, description="One sentence. Required if passes_moat_filter is False."
    )
    confidence: Literal["HIGH", "MEDIUM", "LOW"]

    @model_validator(mode="after")
    def require_conditional_fields(self) -> "MoatAnalysisReport":
        if self.passes_moat_filter:
            if not self.thesis_summary:
                sources = ", ".join(self.moat_sources[:2]) if self.moat_sources else "competitive advantages"
                green = self.green_flags[0] if self.green_flags else "strong fundamentals"
                self.thesis_summary = (
                    f"{self.competitive_moat.capitalize()} moat supported by {sources}. "
                    f"{green}. "
                    f"Management quality rated {self.management_quality.lower()} with {self.confidence.lower()} confidence."
                )
        else:
            if not self.rejection_reason:
                flags = "; ".join(self.red_flags[:2]) if self.red_flags else "did not meet moat criteria"
                self.rejection_reason = f"Rejected: {flags}."
            if not self.primary_disruption_risk:
                self.primary_disruption_risk = self.rejection_reason
        return self


SYSTEM_PROMPT = """You are a disciplined value investor performing moat analysis on a 10-K filing.
Reject if you see ANY of: dividend cuts, losing market share, deteriorating margins over 3+ years,
unresolved litigation/regulatory risk, accounting irregularities, excessive unserviceable debt,
or structural business disruption.
Pass ONLY if the core moat is verifiably intact and the low valuation stems from temporary macro factors.
Be strict. When in doubt, reject."""


async def analyze_moat(
    ticker: str,
    company_name: str,
    sector: str,
    current_price: float,
    pe_ratio: float,
    dividend_yield: float,
    filing_text: str,
    model: str | None = None,
) -> MoatAnalysisReport:
    client = instructor.from_openai(
        AsyncOpenAI(base_url=settings.llm_url, api_key=settings.api_key)
    )

    prompt = (
        f"Analyze {ticker} ({company_name}, {sector}) for moat durability.\n\n"
        f"Price: ${current_price:.2f} | P/E: {pe_ratio:.1f}x | Yield: {dividend_yield * 100:.2f}%\n\n"
        f"10-K EXCERPT:\n{filing_text}\n\n"
        f"Return your structured verdict."
    )

    return await client.chat.completions.create(
        model=model or settings.model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_model=MoatAnalysisReport,
    )

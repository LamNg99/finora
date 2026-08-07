"""
SEDAR+ client — fetches Annual Information Form (AIF) text for Canadian issuers.
AIF is the Canadian equivalent of the SEC 10-K annual report.

SEDAR+ public search: https://efts.sedarplus.ca/LATEST/search-index
"""

import logging
import re
from datetime import datetime, timezone

import httpx

from app.core.config import settings

log = logging.getLogger("finora")

# Canadian tickers we route to SEDAR instead of SEC EDGAR
CANADIAN_TICKERS: set[str] = {
    # Banks & Insurance
    "RY",
    "TD",
    "BNS",
    "BMO",
    "CM",
    "NA",
    "MFC",
    "SLF",
    "GWO",
    # Asset Management
    "BAM",
    "BIP",
    "BEP",
    # Energy
    "ENB",
    "TRP",
    "CNQ",
    "SU",
    "CVE",
    "IMO",
    "PPL",
    # Materials & Mining
    "GOLD",
    "AEM",
    "WPM",
    "FNV",
    "KGC",
    "TECK",
    "CCO",
    "NTR",
    # Technology
    "SHOP",
    "CSU",
    "OTEX",
    "BB",
    # Telecom
    "BCE",
    "RCI",
    "TU",
    "QBR",
    # Utilities
    "FTS",
    "EMA",
    "AQN",
    # Consumer & Industrials
    "ATD",
    "DOL",
    "WCN",
    "CP",
    "CNI",
    "WSP",
}

_SEARCH_URL = "https://efts.sedarplus.ca/LATEST/search-index"
_FILING_BASE = "https://www.sedarplus.ca"

# Form types in priority order — AIF is the primary annual disclosure document
_FORM_PRIORITY = [
    "Annual Information Form",
    "Annual Report",
    "Management's Discussion & Analysis",
]


class SedarClient:
    def __init__(self) -> None:
        self.client = httpx.AsyncClient(
            timeout=60.0,
            headers={
                "User-Agent": settings.sec_user_agent,
                "Accept": "application/json",
            },
        )

    async def _search(
        self,
        company_name: str,
        form_type: str,
    ) -> dict | None:
        """Search SEDAR+ for the most recent filing of a given form type."""
        try:
            r = await self.client.get(
                _SEARCH_URL,
                params={
                    "q": company_name,
                    "forms": form_type,
                    "dateRange": "custom",
                    "startdt": "2020-01-01",
                    "enddt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "hits.hits.total.value": 1,
                    "hits.hits._source.file_date": "desc",
                },
            )
            if not r.is_success:
                return None
            hits = r.json().get("hits", {}).get("hits", [])
            return hits[0] if hits else None
        except Exception as e:  # ruff:ignore[blind-except]
            log.debug(
                "SEDAR+ search error for %s / %s: %s",
                company_name,
                form_type,
                e,
            )
            return None

    async def _fetch_text(
        self,
        url: str,
        max_chars: int = 60_000,
    ) -> str | None:
        try:
            r = await self.client.get(url)
            r.raise_for_status()
            clean = re.sub(r"<[^>]+>", " ", r.text)
            clean = re.sub(r"\s+", " ", clean).strip()
            return clean[:max_chars] if clean else None
        except Exception as e:  # ruff:ignore[blind-except]
            log.debug("SEDAR+ fetch error %s: %s", url, e)
            return None

    async def get_aif_text(
        self,
        ticker: str,
        company_name: str,
        max_chars: int = 60_000,
    ) -> str | None:
        """
        Fetch the most recent AIF (or fallback filing) for a Canadian issuer.

        Returns parsed plain text, or None if nothing found.
        """
        for form_type in _FORM_PRIORITY:
            hit = await self._search(company_name, form_type)
            if not hit:
                continue

            source = hit.get("_source", {})
            doc_url = source.get("file_url") or source.get("document_url")
            if not doc_url:
                # Try to build URL from accession info
                filing_id = source.get("id") or source.get("accession_no")
                if filing_id:
                    doc_url = f"{_FILING_BASE}/filings/{filing_id}"

            if not doc_url:
                continue

            text = await self._fetch_text(doc_url, max_chars)
            if text:
                log.info(
                    "SEDAR+ found %s for %s (%s)",
                    form_type,
                    ticker,
                    company_name,
                )
                return f"[{form_type} — SEDAR+]\n\n" + text

        log.warning(
            "SEDAR+: no filing found for %s (%s)",
            ticker,
            company_name,
        )
        return None

    async def close(self) -> None:
        await self.client.aclose()

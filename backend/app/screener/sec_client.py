"""
SEC EDGAR client — fetches raw 10-K text for LLM analysis.
OpenBB's SEC provider returns structured data; we need the prose text,
so we fetch it directly from EDGAR's public archive.
"""

import re
import httpx
from typing import Optional
from app.core.config import settings


class SECClient:
    def __init__(self):
        self.base_url = "https://data.sec.gov"
        self.headers = {
            "User-Agent": settings.sec_user_agent,
            "Accept-Encoding": "gzip, deflate",
        }
        self.client = httpx.AsyncClient(timeout=60.0, headers=self.headers)

    _ticker_map: dict[str, str] = {}

    async def _load_ticker_map(self) -> None:
        if self._ticker_map:
            return
        resp = await self.client.get("https://www.sec.gov/files/company_tickers.json")
        resp.raise_for_status()
        for entry in resp.json().values():
            t = entry.get("ticker", "").upper()
            if t:
                self._ticker_map[t] = str(entry["cik_str"]).zfill(10)

    async def get_cik(self, ticker: str) -> Optional[str]:
        await self._load_ticker_map()
        return self._ticker_map.get(ticker.upper())

    async def get_latest_filing_url(self, ticker: str) -> Optional[tuple[str, str]]:
        """Returns (url, form_type) for the best available filing: 10-K → S-1/A → S-1."""
        cik = await self.get_cik(ticker)
        if not cik:
            return None

        resp = await self.client.get(f"{self.base_url}/submissions/CIK{cik}.json")
        resp.raise_for_status()
        data = resp.json()

        filings = data.get("filings", {}).get("recent", {})
        forms = filings.get("form", [])
        acc_nums = filings.get("accessionNumber", [])
        docs = filings.get("primaryDocument", [])

        priority = {"10-K": 0, "S-1/A": 1, "424B4": 2, "S-1": 3}
        best: Optional[tuple[int, str, str]] = None  # (priority, url, form)

        for i, form in enumerate(forms):
            if form in priority:
                rank = priority[form]
                if best is None or rank < best[0]:
                    acc_no = acc_nums[i].replace("-", "")
                    url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc_no}/{docs[i]}"
                    best = (rank, url, form)
                    if rank == 0:
                        break  # 10-K found, no need to keep scanning

        return (best[1], best[2]) if best else None

    async def get_latest_10k_url(self, ticker: str) -> Optional[str]:
        result = await self.get_latest_filing_url(ticker)
        return result[0] if result else None

    async def fetch_text(self, url: str, max_chars: int = 60_000) -> str:
        resp = await self.client.get(url)
        resp.raise_for_status()
        clean = re.sub(r"<[^>]+>", " ", resp.text)
        clean = re.sub(r"\s+", " ", clean).strip()
        return clean[:max_chars]

    async def get_10k_text(self, ticker: str, max_chars: int = 60_000) -> Optional[str]:
        result = await self.get_latest_filing_url(ticker)
        if not result:
            return None
        url, form_type = result
        text = await self.fetch_text(url, max_chars)
        if text and form_type != "10-K":
            text = f"[{form_type} FILING — not a 10-K]\n\n" + text
        return text

    async def close(self):
        await self.client.aclose()

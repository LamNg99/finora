# Finora — Automated Equity Screening Dashboard

Finora screens a curated list of equities through three layers:

1. **Quantitative filter** — P/E, dividend yield, FCF/share, D/E thresholds via FMP
2. **Three-method valuation** — DCF, P/FCF reversion, Graham Number for fair value + margin of safety
3. **LLM moat analysis** — SEC 10-K text → structured moat report (thesis, green/red flags, moat rating)

Results are surfaced in a React dashboard with three sections: AI Inbox (passed everything), Watchlist (no quant data, LLM-only), and Rejection Log (passed quant, failed moat).

---

## Prerequisites

- Python 3.13+
- Node.js 18+
- A [Financial Modeling Prep](https://financialmodelingprep.com/) API key (free tier works)
- An OpenAI-compatible LLM endpoint + API key

---

## Setup

### 1. Clone and configure

```bash
git clone <repo-url>
cd finora
```

Create `backend/.env`:

```env
# Financial APIs
FMP_API_KEY=your_fmp_key_here

# LLM endpoint (OpenAI-compatible)
LLM_URL=https://api.openai.com/v1
API_KEY=your_openai_key_here
MODEL=gpt-4o

# Optional
DATABASE_URL=sqlite:///./finora.db
WEBHOOK_URL=                        # Slack/Discord webhook for alerts
CRON_DAY_OF_WEEK=sun
CRON_HOUR=20
CRON_MINUTE=0
```

### 2. Backend

```bash
cd backend
python3.13 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Frontend

```bash
cd frontend
npm install
```

---

## Running

```bash
# From project root — starts backend (8000) and frontend (5173) together
./start.sh
```

Then open **http://localhost:5173**.

To run a screen immediately without waiting for the cron:

```bash
curl -X POST http://localhost:8000/trigger
```

---

## Configuration

### Ticker universe

Edit `UNIVERSE` in `backend/app/screener/obb_client.py`:

```python
UNIVERSE = ["AAPL", "MSFT", "NVDA", "INTC", "SPCX"]
```

The screener fetches each ticker individually from FMP's stable API — no paid screener tier needed.

### Cron schedule

Set via `.env`. Defaults to **Sunday at 20:00** local time.

```env
CRON_DAY_OF_WEEK=sun   # mon, tue, wed, thu, fri, sat, sun
CRON_HOUR=20
CRON_MINUTE=0
```

### Quant thresholds

Edit `THRESHOLDS` in `backend/app/screener/wide_net.py`:

```python
THRESHOLDS = {
    "max_pe": 60.0,      # Max P/E ratio
    "min_yield": 0.001,  # Min dividend yield (0.1%)
    "max_yield": 0.12,   # Max dividend yield (distress signal above 12%)
    "max_dte": 5.0,      # Max debt-to-equity ratio
    "min_fcf_ps": 0.10,  # Min FCF per share ($)
}
```

A stock passes if it clears at least one of: P/E signal, dividend signal, or positive FCF — then passes D/E and FCF gates. Tickers with no FMP ratio data (new listings, private companies post-IPO) automatically bypass quant and go to the LLM Watchlist.

### Webhook notifications

Set `WEBHOOK_URL` to a Slack or Discord incoming webhook. Finora posts when a run finds at least one fortress asset.

---

## Architecture

```
FMP stable API ──► obb_client.py ──► wide_net.py (quant filter)
                                              │
                              ┌───────────────┴──────────────┐
                         survivors                       bypassed
                              │                               │
                    valuation.py (DCF/                        │
                    P/FCF/Graham)                             │
                              │                               │
                    SEC EDGAR ──► sec_client.py ──► 10-K text
                                                        │
                                              llm_analyzer.py
                                              (instructor + LLM)
                                                        │
                                              SQLite (SQLModel)
                                                        │
                                              FastAPI REST API
                                                        │
                                            React dashboard
```

**Backend** — FastAPI with factory pattern (`app/factory.py`), APScheduler for cron, SQLModel + SQLite, `instructor` for structured LLM output.

**Frontend** — React + TypeScript + Vite + Tailwind CSS, CSS custom property tokens for theming, Radix UI Accordion for the Rejection Log.

---

## API

| Endpoint | Description |
|---|---|
| `GET /health` | Status and next scheduled run time |
| `POST /trigger` | Start a screen run immediately (background) |
| `GET /runs` | Recent run history |
| `GET /runs/{id}/stocks` | All stocks analyzed in a specific run |
| `GET /stocks` | Latest analysis per ticker |
| `GET /fortress` | Latest analysis per ticker, passed-only |

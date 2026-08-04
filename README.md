# Finora — Automated Equity Screening Dashboard

Live at **[finoraquant.com](https://finoraquant.com)**

Finora screens a curated universe of equities through three layers:

1. **Quantitative filter** — P/E, dividend yield, FCF/share, D/E thresholds via FMP
2. **Three-method valuation** — DCF, P/FCF reversion, Graham Number for fair value + margin of safety
3. **LLM moat analysis** — Annual filing text → structured moat report (thesis, green/red flags, moat rating)

Results are surfaced in a React dashboard with three sections: **AI Inbox** (passed everything), **Watchlist** (no quant data, LLM-only), and **Rejection Log** (failed moat or no filing).

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
MODEL=gpt-oss-20b

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

To run a screen immediately without waiting for the cron, use the **Analyze** button in the UI, or via curl:

```bash
# Screen the default UNIVERSE with the default model
curl -X POST http://localhost:8000/trigger

# Custom tickers and model
curl -X POST http://localhost:8000/trigger \
  -H "Content-Type: application/json" \
  -d '{"tickers": ["AAPL", "MSFT", "BNS"], "model": "gpt-oss-20b"}'
```

---

## Configuration

### Weekly universe

The default 20-ticker universe runs automatically each week. Edit `UNIVERSE` in `backend/app/screener/obb_client.py`:

```python
UNIVERSE = ["AAPL", "MSFT", "NVDA", "INTC", "AMD", ...]
```

Current default covers large-cap US equities (tech, semiconductors, financials, consumer) and major cross-listed Canadian stocks.

### On-demand screening

The UI lets you pick any tickers from a ~310-stock list (S&P 500 + major Canadian equities) and choose the LLM model per run. Available models are defined in `frontend/src/data/models.ts`.

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

Tickers with no FMP ratio data automatically bypass quant and go directly to LLM analysis (shown in the Watchlist section).

### Webhook notifications

Set `WEBHOOK_URL` to a Slack or Discord incoming webhook. Finora posts when a run finds at least one fortress asset.

---

## Canadian stock support

Cross-listed Canadian stocks (RY, TD, BNS, SHOP, ENB, etc.) are handled automatically:

- **SEC EDGAR** — checked first via 40-F (the MJDS annual report form) or 10-K if available
- **SEDAR+** — fallback for TSX-only issuers with no SEC filings

The list of Canadian tickers is in `backend/app/screener/sedar_client.py` (`CANADIAN_TICKERS`).

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
                    SEC EDGAR ──► sec_client.py ──► 10-K / 40-F / 20-F text
                    SEDAR+    ──► sedar_client.py ──► AIF text (Canadian)
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

**Backend** — FastAPI with factory pattern (`app/factory.py`), APScheduler for cron, SQLModel + SQLite, `instructor` for structured LLM output. Swagger/ReDoc disabled in production; direct API navigation from a browser redirects to the SPA.

**Frontend** — React + TypeScript + Vite + Tailwind CSS, CSS custom property tokens for theming, Radix UI Accordion for the Rejection Log.

---

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Status and next scheduled run time |
| `POST` | `/trigger` | Start a screen run — optional body `{ tickers, model }` |
| `GET` | `/runs` | Recent run history |
| `GET` | `/runs/{id}/stocks` | All stocks analyzed in a specific run |
| `GET` | `/stocks` | Latest analysis per ticker |
| `GET` | `/fortress` | Latest analysis per ticker, passed-only |

---

## Deployment

The project ships with a GitHub Actions workflow (`.github/workflows/deploy.yml`) that:

1. Builds a Docker image with the backend frozen via **cx_Freeze** and pushes it to GHCR
2. Builds the frontend with `npm run build`
3. Rsyncs `frontend/dist/` to `/var/www/finora/` on the server
4. Pulls and restarts the backend container via `docker compose`

**nginx** proxies `/api/` to the backend container, rate-limits `/api/trigger`, and serves the frontend static files with HTTP→HTTPS and www→apex redirects.

Required GitHub secrets: `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_USER`, `GHCR_TOKEN`.

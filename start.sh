#!/bin/bash
set -e

echo "Starting Finora backend (FastAPI)..."
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
deactivate
cd ..

echo "Starting Finora frontend ..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "Finora is running:"
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:5173"
echo ""
echo "Cron fires every Sunday at 20:00 (configure via CRON_* env vars)."
echo "Run a manual screen any time from the dashboard or: curl -X POST http://localhost:8000/trigger"
echo ""
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait

#!/bin/sh
set -eu

export PYTHONPATH="/app/backend:${PYTHONPATH:-}"
export SHELFWISE_API_ORIGIN="${SHELFWISE_API_ORIGIN:-http://127.0.0.1:8331}"

echo "[start] launching API on 127.0.0.1:8331"
cd /app/backend
uvicorn app.main:app --host 127.0.0.1 --port 8331 &
API_PID=$!

# Wait briefly for API bind (DB seed may take a few seconds).
i=0
while [ "$i" -lt 30 ]; do
  if wget -qO- "http://127.0.0.1:8331/health" >/dev/null 2>&1; then
    echo "[start] API healthy"
    break
  fi
  i=$((i + 1))
  sleep 1
done

echo "[start] launching Next.js on 0.0.0.0:${PORT:-10000}"
cd /app
npm run start:render &
WEB_PID=$!

term() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap term INT TERM

wait "$WEB_PID"
term

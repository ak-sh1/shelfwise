# Shelfwise

Multi-user inventory and order management for a small shop.

**Live demo:** [https://shelfwise-2gup.onrender.com](https://shelfwise-2gup.onrender.com)  
**Repo:** [github.com/ak-sh1/shelfwise](https://github.com/ak-sh1/shelfwise)

**Stack:** Next.js · FastAPI · PostgreSQL · Docker · Render

## Demo logins

| Role  | Email                   | Password  |
|-------|-------------------------|-----------|
| Owner | owner@shelfwise.demo    | owner123  |
| Staff | staff@shelfwise.demo    | staff123  |

> Free Render tier: after idle time, the first request may take ~30–60s while the service wakes up.

## What it does

- Owner / staff roles with JWT auth for one shop
- Product catalog (CRUD, CSV import, low-stock filter)
- Stock adjustments with movement history
- Purchase & sale orders (draft → confirm updates inventory)
- Dashboard with low-stock alerts and recent activity
- Optional AI category suggest (heuristic fallback without an API key)

## Deploy on Render

Blueprint (`render.yaml`) creates:

- **shelfwise-db** — Postgres
- **shelfwise** — UI + API in one Docker web service

1. Open [New Blueprint](https://dashboard.render.com/blueprints/new) → connect `ak-sh1/shelfwise` (`main`) → Apply.
2. Wait until **shelfwise** is Live.
3. Open the service URL (e.g. `https://shelfwise-2gup.onrender.com`).

## Local development

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 14+

### Database

```bash
createdb shelfwise
# or: docker compose up -d db
```

### API

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 8331 --reload
```

### UI

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://127.0.0.1:4331](http://127.0.0.1:4331). The app proxies `/api/*` to FastAPI.

## Project layout

```
backend/app/     FastAPI
src/             Next.js UI
Dockerfile       Combined UI+API image (Render)
start.sh         Starts uvicorn + Next.js
render.yaml      Blueprint (db + web)
```

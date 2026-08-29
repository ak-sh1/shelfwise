# Shelfwise

**Repo:** [github.com/ak-sh1/shelfwise](https://github.com/ak-sh1/shelfwise)

Multi-user inventory and order management for a small shop.

**Stack:** Next.js (UI) · FastAPI (API) · PostgreSQL · optional OpenAI categorize

## What it does

- Owner / staff roles for one shop
- Product catalog with SKUs, cost/price, reorder levels, and edit
- Manual stock adjustments with **movement history**
- Purchase & sale orders (draft → confirm applies stock; expand for line detail)
- Low-stock dashboard plus **recent activity** feed
- CSV product import (owners)
- Optional AI category suggest (falls back to keyword rules without an API key)

## Demo logins

| Role  | Email                   | Password  |
|-------|-------------------------|-----------|
| Owner | owner@shelfwise.demo    | owner123  |
| Staff | staff@shelfwise.demo    | staff123  |

## Live demo (Render)

Everything runs on [Render](https://render.com): Postgres, FastAPI, and Next.js.

Public URL: your **shelfwise-web** service (e.g. `https://shelfwise-web.onrender.com`).

## Deploy on Render

1. Open [Render Blueprint](https://dashboard.render.com/blueprints/new) and connect `ak-sh1/shelfwise` (`main`).
2. Apply the blueprint. It creates:
   - **shelfwise-db** — PostgreSQL
   - **shelfwise-backend** — FastAPI (Docker) → `https://shelfwise-backend.onrender.com`
   - **shelfwise-web** — Next.js UI → `https://shelfwise-web.onrender.com`
3. Wait until **both** web services are Live (free tier cold-starts can take ~1 min).
4. Open the **shelfwise-web** URL and sign in with a demo account.

### If sign-in fails

1. Confirm **shelfwise-backend** `/health` returns `{"status":"ok"}` and `/docs` shows FastAPI (not a .NET/Kestrel app).
2. Delete any old unrelated service named **shelfwise-api** (Kestrel) — it is not this project.
3. On **shelfwise-web → Environment**, `SHELFWISE_API_ORIGIN` should look like `shelfwise-backend:10000` (private) **or** set it manually to `https://shelfwise-backend.onrender.com` and redeploy.
4. Soft-restart **shelfwise-web** after the backend is Live.

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
python3 -m venv .venv
source .venv/bin/activate
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

Open [http://127.0.0.1:4331](http://127.0.0.1:4331). `/api/*` proxies to FastAPI.

### Optional AI

Set `OPENAI_API_KEY` in `backend/.env`.

## CSV import columns

`sku,name,description,category,unit_cost,unit_price,quantity_on_hand,reorder_level`

See `sample-products.csv`.

## Project layout

```
backend/app/          FastAPI
src/                  Next.js UI
src/app/api/          Runtime /api → FastAPI proxy
render.yaml           Render blueprint (db + backend + web)
```

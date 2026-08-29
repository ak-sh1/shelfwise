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

Everything runs on [Render](https://render.com): Postgres, FastAPI API, and Next.js UI.

**After deploy:** open your **shelfwise-web** URL (e.g. `https://shelfwise-web.onrender.com`).

The UI proxies `/api/*` to the API service at runtime — no cross-origin setup needed.

## Deploy on Render

1. Open [Render Blueprint](https://dashboard.render.com/blueprints/new) and connect `ak-sh1/shelfwise`.
2. Apply the blueprint. It creates three resources:
   - **shelfwise-db** — PostgreSQL
   - **shelfwise-api** — FastAPI (Docker)
   - **shelfwise-web** — Next.js UI
3. Wait for all services to go live (free tier may cold-start on first visit).
4. Use the **shelfwise-web** URL as your public app link.

If you previously had a broken or unrelated **shelfwise-api** service (e.g. wrong runtime), delete it in the Render dashboard before applying the blueprint, or create a fresh blueprint from this repo.

Pushes to the connected branch trigger auto-deploy on Render.

## Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 14+

## Local development

### Database

```bash
createdb shelfwise   # or use docker compose below
# user/password defaults in backend/.env
```

```bash
# optional
docker compose up -d db
```

### API

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # if needed
PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 8331 --reload
```

Tables are created and demo data is seeded on startup.

### UI

```bash
npm install
cp .env.local.example .env.local   # uses same-origin /api proxy by default
npm run dev
```

Open [http://127.0.0.1:4331](http://127.0.0.1:4331).

The Next.js app proxies `/api/*` to the FastAPI server at `http://127.0.0.1:8331`.

API docs: [http://127.0.0.1:8331/docs](http://127.0.0.1:8331/docs).

### Optional AI

Set `OPENAI_API_KEY` in `backend/.env`. Without it, category suggest uses local heuristics.

## CSV import columns

`sku,name,description,category,unit_cost,unit_price,quantity_on_hand,reorder_level`

See `sample-products.csv`.

## Project layout

```
backend/app/     FastAPI app, models, routers
src/             Next.js App Router UI
src/app/api/     Runtime /api proxy to FastAPI (local + Render)
```

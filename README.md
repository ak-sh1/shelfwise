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

## Live demo

**Public URL (while this Cloud Agent is running):**  
https://leon-slideshow-com-recreation.trycloudflare.com

| Role | Email | Password |
|------|--------|----------|
| Owner | owner@shelfwise.demo | owner123 |
| Staff | staff@shelfwise.demo | staff123 |

> This Cloudflare tunnel is temporary. For a permanent resume link, use the Render blueprint below.

## Deploy (permanent, free)

### Option A — Render Blueprint (recommended)

1. Open [Render Blueprint](https://dashboard.render.com/blueprints/new) and connect `ak-sh1/shelfwise`.
2. Render creates free Postgres + `shelfwise-api` + `shelfwise-web`.
3. After both services are live, set API `CORS_ORIGINS` to your web URL (e.g. `https://shelfwise-web.onrender.com`) if you did not use `*`.
4. Open the **shelfwise-web** URL — use the demo logins above.

### Option B — Vercel (UI) + Render (API/DB)

1. Deploy `backend/` Docker service + Postgres on Render.
2. Deploy the repo root on [Vercel](https://vercel.com/new) with env:
   - `NEXT_PUBLIC_API_URL` = your Render API URL (no trailing slash)
   - `SHELFWISE_API_ORIGIN` = same API URL
3. Set API `CORS_ORIGINS` to your Vercel domain.

## Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 14+

## Setup

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

The Next.js app proxies `/api/*` to the FastAPI server, so the browser does not need to reach port `8331` directly.

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
```

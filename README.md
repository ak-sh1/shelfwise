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

**Frontend (Vercel):** [https://shelfwise-ak-dac3.vercel.app](https://shelfwise-ak-dac3.vercel.app)

The UI is deployed on Vercel. The API runs on Render (Postgres + FastAPI). After both are live, set Vercel env `SHELFWISE_API_ORIGIN` to your Render API URL (see Deploy below).

| Role | Email | Password |
|------|--------|----------|
| Owner | owner@shelfwise.demo | owner123 |
| Staff | staff@shelfwise.demo | staff123 |

## Deploy (permanent)

### 1 — Vercel (UI) — already connected

Repo `ak-sh1/shelfwise` → project **shelfwise** on team **AK**. Pushes to `main` auto-deploy.

### 2 — Render (API + Postgres)

1. Open [Render Blueprint](https://dashboard.render.com/blueprints/new) and connect `ak-sh1/shelfwise`.
2. Apply the blueprint (creates **shelfwise-db** + **shelfwise-api**).
3. Copy the API URL when live (e.g. `https://shelfwise-api.onrender.com`).

### 3 — Link Vercel → API

In [Vercel → shelfwise → Settings → Environment Variables](https://vercel.com/ak-dac3/shelfwise/settings/environment-variables):

| Name | Value |
|------|--------|
| `SHELFWISE_API_ORIGIN` | `https://shelfwise-api.onrender.com` (your Render API URL, no trailing slash) |

Redeploy production. The Next.js app proxies `/api/*` to that origin.

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

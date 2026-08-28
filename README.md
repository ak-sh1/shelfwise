# Shelfwise

**Repo:** [github.com/ak-sh1/shelfwise](https://github.com/ak-sh1/shelfwise)

Multi-user inventory and order management for a small shop.

**Stack:** Next.js (UI) · FastAPI (API) · PostgreSQL · optional OpenAI categorize

## What it does

- Owner / staff roles for one shop
- Product catalog with SKUs, cost/price, reorder levels
- Manual stock adjustments with movement history
- Purchase & sale orders (draft → confirm applies stock; sales block on insufficient qty)
- Low-stock dashboard
- CSV product import (owners)
- Optional AI category suggest (falls back to keyword rules without an API key)

## Demo logins

| Role  | Email                   | Password  |
|-------|-------------------------|-----------|
| Owner | owner@shelfwise.demo    | owner123  |
| Staff | staff@shelfwise.demo    | staff123  |

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
cp .env.local.example .env.local
npm run dev
```

Open [http://127.0.0.1:4331](http://127.0.0.1:4331).

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

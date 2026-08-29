# Shelfwise

**Repo:** [github.com/ak-sh1/shelfwise](https://github.com/ak-sh1/shelfwise)

Multi-user inventory and order management for a small shop.

**Stack:** Next.js (UI) · FastAPI (API) · PostgreSQL · optional OpenAI categorize

## Demo logins

| Role  | Email                   | Password  |
|-------|-------------------------|-----------|
| Owner | owner@shelfwise.demo    | owner123  |
| Staff | staff@shelfwise.demo    | staff123  |

## Deploy on Render (recommended)

One Blueprint creates:

- **shelfwise-db** — Postgres  
- **shelfwise** — UI + API in a single Docker web service  

1. Delete old split services if you have them (`shelfwise-web`, `shelfwise-backend`, broken `shelfwise-api`) so names/ports don’t collide.
2. Open [New Blueprint](https://dashboard.render.com/blueprints/new) → connect `ak-sh1/shelfwise` (`main`) → **Apply**.
3. Wait until **shelfwise** is **Live** (first Docker build can take several minutes).
4. Open `https://shelfwise.onrender.com` (exact URL is on the service page).

Free-tier cold start: first request after idle may take ~30–60s.

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

Open [http://127.0.0.1:4331](http://127.0.0.1:4331).

## Project layout

```
backend/app/     FastAPI
src/             Next.js UI
Dockerfile       Combined UI+API image for Render
start.sh         Starts uvicorn + next on Render
render.yaml      Blueprint (db + one web service)
```

# Aljabr Laundry Task App

React frontend and FastAPI backend for branch and workflow request management.

## Project Structure

- `frontend/` - React app built with CRACO and Tailwind CSS
- `backend/` - FastAPI API backed by Supabase Postgres
- `render.yaml` - Render blueprint for deploying both services

## Required Environment Variables

Backend:

```env
SUPABASE_DB_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=https://your-frontend-domain.com
CORS_ORIGINS=https://your-frontend-domain.com
RESEND_API_KEY=
SENDER_EMAIL=onboarding@resend.dev
ADMIN_EMAIL=
```

Frontend:

```env
REACT_APP_BACKEND_URL=https://your-api-domain.com
```

Example files are available at `backend/.env.example` and `frontend/.env.example`.

## Local Development

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

For local frontend development, set `REACT_APP_BACKEND_URL=http://localhost:8000`.

## Deployment

The included `render.yaml` can deploy:

- `aljabr-laundry-api` as a Python web service
- `aljabr-laundry-frontend` as a static React site

After the first deploy, set these cross-service values:

- Backend `SUPABASE_DB_URL` should be the Supabase pooled Postgres connection string.
- Backend `FRONTEND_URL` and `CORS_ORIGINS` should be the deployed frontend URL.
- Frontend `REACT_APP_BACKEND_URL` should be the deployed backend URL.

## Supabase Setup

Create a Supabase project, then copy the pooled Postgres connection string from Project Settings > Database. Use it as `SUPABASE_DB_URL`.

The backend creates its required table and indexes automatically on startup. You can also run `backend/supabase_schema.sql` in the Supabase SQL Editor.

## Health Check

The API health endpoint is:

```text
/api/
```

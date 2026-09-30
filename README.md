# Polar Portal backend

A FastAPI modular monolith for the Polar science archive, editorial workflow, and Discover feed. The frontend stays intentionally small and uses the existing `/api` proxy to this backend.

## Free, self-hosted stack

- FastAPI, SQLAlchemy, Alembic, and Uvicorn
- PostgreSQL 16 with pgvector vectors, HNSW indexes, and a GIN full-text index; SQLite stores vectors as JSON for lightweight local development
- Redis + RQ for retryable ingestion jobs
- RustFS for self-hosted S3-compatible object storage
- Local deterministic embeddings by default; no paid AI or storage services are called
- Optional Ollama can provide local embeddings and grounded local LLM drafts by setting `LLM_PROVIDER=ollama`, `MODEL_BASE_URL`, and `MODEL_NAME`

## Start with Docker Compose

1. Copy `.env.example` to `.env` and replace `SECRET_KEY`, `ADMIN_PASSWORD`, `POSTGRES_PASSWORD`, and storage credentials before exposing this beyond localhost.
2. Start the stack: `docker compose -f infra/docker-compose.yml up --build`.
3. Open the site at `http://localhost:3000`, API docs at `http://localhost:8000/docs`, and the RustFS console at `http://localhost:9001`.
4. Open `http://localhost:3000/login` to sign in. The first administrator uses the configured `ADMIN_EMAIL` and `ADMIN_PASSWORD` (defaults are for local development only). The web app stores backend tokens in secure, HttpOnly cookies and forwards them through its same-origin API proxy. Public browsing does not require an account; user accounts are created by an administrator through the protected `/api/users` endpoint.

### Seed NCPOR-linked demo content

After the API is healthy, populate the catalogue, search index, one demo story, and Discover feed with repeatable sample records:

```sh
docker compose -f infra/docker-compose.yml exec api python -m app.seed_demo
```

The seed is idempotent. It links to public NCPOR pages, station photo galleries, NCPOR's official YouTube channel, and a published annual report; it does not download or copy their media. Each seeded asset carries `metadata.demo`, its source URL, and an attribution/usage note. Photo and video entries are source links, not locally hosted binaries. Use the staff upload endpoint to ingest files you have permission to store. Remove the records marked `metadata.demo` if you want a clean catalogue.

Database schema upgrades run through Alembic at API startup. Persistent volumes hold Postgres, Redis, and RustFS data. Keep backups of those volumes in any real deployment.

## Deploy the API to Render

Create a new Blueprint in Render from this repository and select `render.yaml`. It provisions a Docker web service and PostgreSQL database. During setup, provide `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `CORS_ORIGINS`; Render generates `SECRET_KEY` automatically. The API will be available at the service URL, with interactive docs at `/docs` and health status at `/health`.

The Blueprint intentionally uses the free web and database plans. The free database is temporary and has limited storage; Render's free web service may sleep. Redis and the background worker are not included, so file ingestion runs synchronously. Without an S3-compatible storage service configured, uploaded files use the local filesystem and can be lost when the service restarts. Configure `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, and `STORAGE_BUCKET` with an S3-compatible provider for persistent uploads. Add a paid Render Key Value service and worker later if background ingestion is needed.

## Run API without containers

Use Python 3.12+, create a virtual environment, install `requirements.txt`, then configure `DATABASE_URL=sqlite:///./polar.db`, `REDIS_URL`, storage settings, and `API_PROXY_TARGET=http://localhost:8000`. From `backend/`, apply schema upgrades with `alembic upgrade head`, run the API with `uvicorn app.main:app --reload`, then start the frontend in another terminal with `npm run dev`. Redis and RustFS are optional for development: uploads fall back to local `backend/media` storage and ingestion runs inline when RQ is unavailable.

## API areas

- `/api/auth/*`: login, refresh, current user; bearer JWT and role checks
- `/api/users`, `/api/expeditions`, `/api/assets`, `/api/tags`, `/api/config`: protected CMS/catalog
- `/api/ingest/upload`: allowlisted extension, byte limit, object storage, asynchronous extraction/chunking/indexing
- `/api/search`, `/api/search/images`: filters, keyword/full-text+vector hybrid ranking, query logs (image search has a lexical fallback until a local CLIP encoder is configured)
- `/api/generate`: source-chunk-grounded deterministic draft by default, or local Ollama generation with exact-span citation validation; no cloud LLM
- `/api/editorial/*`, `/api/stories`: state transitions, review comments, scheduling, public stories
- `/api/feed/*`: public feed/reels/reactions/views, post media and citation links, staff publishing/review/archive workflow
- `/api/outreach/stories`: multi-slide public Stories with media, expiration, source citations, staff review and scheduled publishing
- `/api/discovery/search`: hybrid keyword/local-vector search across ready repository assets, published outreach posts, Stories, and articles; filter by region, expedition, year, station, theme, and content type
- `/api/generate`: creates source-cited article/social drafts; `post`, `reel`, and `story` formats also create linked draft feed/story records, which still require staff review
- `/api/analytics/summary`, `/health`, `/metrics`

All administration routes require JWT roles. The first admin is bootstrapped from environment values. Access tokens expire; refresh tokens are separate. Uploading runs extraction in RQ with retries; failed asset status and error are recorded. The worker publishes due stories/feed items and recomputes feed ranking once per minute.

## Free deployment note

The stack uses open-source software that can be hosted on a machine you control, so the application does not require any paid API or vendor account. Free hosted tiers change and often sleep, limit storage, or do not support persistent disks/background workers; for reliable public operation, use an institution-provided machine or a small self-managed server and monitor its storage, backups, and availability. No service-level guarantee is implied by a “free” tier.

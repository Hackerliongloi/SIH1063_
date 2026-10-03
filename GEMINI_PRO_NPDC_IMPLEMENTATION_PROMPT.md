# Gemini Pro implementation brief: NPDC dataset workflow

Copy the prompt below into Gemini Pro with this repository open. Keep the repository instructions in `AGENTS.md` active.

---

## Role and objective

You are the implementation engineer working in this existing Polar Portal repository. Complete the end-to-end NPDC-inspired dataset discovery and submitter workflow described below. The repository is a FastAPI modular monolith with SQLAlchemy/Alembic, PostgreSQL (plus SQLite development support), Redis/RQ ingestion, RustFS/S3-compatible or local storage, and a Next.js App Router frontend that calls the backend through the same-origin `/api` proxy.

Deliver working, integrated software across persistence, API, authorization, UI, configuration, migrations, documentation, and focused tests. Do not stop at a plan, mock UI, or API-only implementation. Do not promise zero bugs. Work in small milestones, inspect your changes, and report evidence and limitations honestly.

## Non-negotiable repository rules

1. Before editing, read `AGENTS.md`, `HANDOFF.md`, `README.md`, `ANTIGRAVITY_NPDC_FEATURE_PROMPT.md`, and inspect `git status` plus the complete current diff. Preserve unrelated and pre-existing edits.
2. The repo instruction says this Next.js version may have breaking changes. Before any frontend code edit, find and read the relevant guide under `node_modules/next/dist/docs/` for the App Router, server/client component, form, routing, or API pattern being changed. Follow its current APIs and deprecation notices.
3. Inspect actual models, Alembic history, authentication, storage and ingestion, API proxy, frontend conventions, deployment files, and tests before deciding what is missing. The `ANTIGRAVITY_NPDC_FEATURE_PROMPT.md` is the detailed acceptance brief; verify every claimed gap against code. Reuse working functionality and do not duplicate it.
4. Add deployed schema changes through Alembic migrations. Never rely on `create_all` to update deployed databases. Keep PostgreSQL and SQLite behavior compatible where the project supports both.
5. Do not add a new vendor, paid service, AI dependency, or storage dependency. No mock success responses for real workflows. Do not commit unless explicitly requested.
6. Do not modify or remove user changes just to make a diff clean. If an existing change conflicts with this work, explain the conflict and choose the smallest safe integration.

## Product boundaries

Implement the capabilities described in `National_Polar_Data_Center.pdf` as workflows in this product. The PDF is a functional reference, not a mandate to copy an external site's branding, claim official affiliation, scrape external systems, or fabricate records/policies. Keep Polar Portal branding and architecture. Do not invent required metadata, file retention, license, approval authority, affiliation policy, or file limits. Derive fields from current project data and the reference; make policy-dependent values explicit/configurable, document conservative defaults, and ask one precise question only if a real policy decision blocks safe implementation. Complete independent work first.

## Required read-only audit and plan

Start by writing a short audit in `HANDOFF.md` or a suitable existing implementation note. For each capability, mark **complete**, **partial**, or **missing**, point to the code/API/model/UI that proves it, and state the smallest required gap:

- Anonymous published dataset catalogue, hybrid search, pagination, sort, and filters.
- Existing region/station/expedition/year/type/tag metadata and tag discovery.
- Expedition search/detail; dataset detail and structured metadata.
- Staff create/edit and existing version/history behavior.
- Upload allowlisting, size/content checks, storage, asynchronous ingestion, failure states, retry.
- Existing authentication, user provisioning, roles, and API proxy/cookie behavior.
- Any registration/activation, submitter ownership, review/publish lifecycle, submitter dashboard, late upload/replacement, observation availability, voyage discovery, and PDF/XML exports.

Then propose a milestone plan. Do not implement a capability marked complete unless integration work is needed to satisfy an acceptance criterion.

### Verified repository baseline — treat these as leads to re-check, not as permission to skip inspection

An initial code inspection already found the following. Gemini must verify the current working tree and exact behavior before relying on it:

| Capability | Known implementation | Initial assessment / required focus |
|---|---|---|
| Public catalogue | `GET /api/assets` and `GET /api/search` in `backend/app/main.py`; the frontend has `/explore` and asset detail pages. | Partial/implemented. Verify all public routes filter strictly on the intended publication policy; today `Asset.status` is also used for ingestion. |
| Search and metadata | Assets contain type, title, description, expedition, region, station, year, tags, and JSON metadata. Expeditions have year, region, date range, stations, and description. | Much of discovery is already present. Verify which metadata is searchable and which filters/UX are truly missing. Do not infer observation availability from unrelated fields. |
| Authentication | Login, refresh, current-user, activation endpoints, hashed activation tokens, and rate limiting exist in `main.py`. Inactive users are rejected by login and refresh. | Partial. Public registration logs a raw activation URL and claims “Check your email”; there is no verified email delivery configuration. Do not log activation tokens. Preserve admin submitter approval unless deliberately changed with justification. |
| Submitter experience | `/api/submitter/datasets`, `/api/submitter/datasets/{id}`, `POST /api/datasets`, `/api/datasets/{id}/upload`, and `/api/datasets/{id}/transition` exist. UI exists under `src/app/submitter/` for listing, creating, and managing datasets. | Partial, not missing. Audit ownership on every action, role checks, edit/replacement support, dashboard completeness, state transitions, and UI error/status states. Improve existing screens rather than creating duplicate routes/pages. |
| Review lifecycle | Dataset transitions are implemented in `main.py`, but currently mutate `Asset.status`; there is no evident dataset-specific transition-history table. | Incomplete/unsafe. Review rules and durable actor/time/comment history need inspection and likely extension. Existing editorial/feed lifecycle is not a substitute for dataset review. |
| File ingestion | `Asset.status` is assigned `processing`, `ready`, and `failed` by upload/worker paths; assets store file keys and version snapshots. | Existing ingestion workflow. Preserve it. Audit replacement atomicity, content validation, error handling, retry, and interaction with review. |
| Metadata history | `AssetVersion` exists and asset creation stores a snapshot. | Partial. Confirm whether edits and file replacements create versions and whether metadata snapshots are complete. Do not claim full audit history just because the table exists. |
| Exports | `/api/assets/{id}/export/xml` and `/api/assets/{id}/export/pdf` routes already exist in `main.py`. | Partial/implemented. Inspect actual escaping, determinism, schema/documentation, PDF readability, headers, filename safety, and authorization. Fix these routes; do not create duplicates. |
| Admin and roles | Existing roles include admin, editor, reviewer, submitter, public_user, and pending_submitter. An admin approval endpoint promotes pending submitters. | Preserve role boundaries. Public registration must not self-assign privileged roles or bypass the intended submitter approval step. |

**Critical design constraint:** `Asset.status` currently carries ingestion states (`processing`, `ready`, `failed`) and dataset workflow states (`draft`, `in_review`, `rejected`, `archived`). Do not add a publication state such as `approved` to this same field and assume it is independent. The ingestion worker writes `ready`/`failed` and can overwrite a review decision. Design separate persisted dimensions, for example `processing_status` (with a safe migration from current values) and `review_status`/`publication_status`, or another clearly justified model that preserves API compatibility. Update all readers/writers and public filters consistently. A record is public only when the publication state is approved/published and any required file is ready; metadata-only publication should follow an explicit product rule rather than an accidental status side effect.

Also, do not automatically equate every existing `status="ready"` asset with reviewed/approved. Inspect existing records, seed/demo data, and current public behavior; propose and document a migration mapping that preserves intended public records without silently treating ingestion success as review. If data provenance is insufficient, make a conservative, reversible backfill and identify the records needing staff review.

## Target architecture

Use the existing modular monolith. Follow the project's naming, dependency injection, API response, error, auth, and frontend component conventions discovered during the audit.

### Persistence and lifecycle

- Extend the existing dataset/asset model if it is the established dataset record. Do not create a second catalogue model that duplicates current assets. Keep editorial stories/posts separate from scientific dataset review.
- Model dataset metadata and workflow explicitly. Reuse existing structured fields where present; validate any extension metadata for type, size, and shape. Add only fields justified by the audit and reference.
- Enforce a server-side dataset lifecycle in a state dimension separate from ingestion. At minimum support draft, submitted/pending review, changes requested or rejected, approved/published, and withdrawn/archived where compatible with existing patterns. Define allowed transitions in one service or domain layer and reject invalid transitions consistently. Only explicitly approved/published records can enter public search, detail, media, or export responses. Keep backward compatibility for clients that currently read `status`; define a clear response contract during migration (for example retain legacy ingestion `status` and expose a separate `review_status`) and update all frontend callers.
- Persist review action, actor, timestamp, and comment. Preserve existing history and add version/audit records for metadata edits and file replacements. Associate each submitter-created dataset with an owner. Staff access must follow current roles; do not create self-assignable privileged roles.
- Support metadata submission before files exist. Model file state separately from dataset publication state: pending/not uploaded, queued/processing, ready, failed, and replacement as appropriate to the current ingestion model. A failed processing job must not silently publish a broken file.
- File replacement must be recoverable: stage and validate the new object, commit the database/version state safely, and only then retire the old object. Handle failure at every boundary without orphaning the only valid copy or exposing private object URLs.
- Add a migration with safe defaults/backfill for current records. Existing public assets should not unexpectedly disappear or become private; decide and document a reversible, evidence-based mapping based on existing data. Never infer review approval solely from a processing status without documenting the product assumption and its consequences.

### Registration and account safety

- Extend the existing `/api/auth/register` and `/api/auth/public/register` paths only after understanding their separate semantics. Normalize email and enforce uniqueness in the database. Hash passwords with the existing secure password utility. Never allow role selection from public registration. Preserve and test the current admin approval step for `pending_submitter` unless the product brief explicitly changes it.
- New accounts are inactive until verified. Generate cryptographically random, expiring, single-use activation tokens; persist only a hash; compare safely; consume once. Add rate limiting using an existing mechanism or a conservative local-compatible implementation. Avoid account enumeration in responses where appropriate.
- Email delivery must use a configured provider/mechanism that actually exists in the deployment. SMTP is an acceptable configurable option only if implemented with TLS/authentication, timeout/error handling, safe secret configuration, and tests; do not stop to ask about provider preference before completing independent audit/work. If no sender is configured, fail safely with clear operator/user guidance; never say an email was sent and never print activation secrets to logs. Remove the existing raw activation-link logging. No tokens/passwords in logs or frontend responses. Update `.env.example` and deployment docs without secrets.
- Login, refresh, and current-user endpoints must reject inactive users. Preserve existing admin bootstrap and staff role behavior. Test activation expiry/reuse and inactive login.

### API boundary

- Keep public search anonymous and same-origin frontend calls on the existing `/api` proxy. Confirm proxy cookie/token forwarding before changing auth.
- Extend existing routes following existing response conventions; do not create duplicate public exports or submitter CRUD. The current candidates include `/api/submitter/datasets`, `/api/submitter/datasets/{id}`, `/api/datasets`, `/api/datasets/{id}/upload`, `/api/datasets/{id}/transition`, and `/api/assets/{id}/export/{xml,pdf}`. Verify and repair each route's backend-enforced ownership, staff authorization, transitions, serialization, and error behavior. Add routes only for a demonstrated missing operation (for example metadata update or versioned file replacement).
- Validate request schemas, IDs/foreign keys, dates, pagination bounds, metadata size, file extension/content/size, and state transitions. Do not trust client MIME or filenames. Sanitize generated download filenames and prevent path traversal.
- Public responses must use an explicit allowlist/serializer so drafts, pending/rejected/withdrawn data and private file locations cannot leak. Enforce publication filters in every public path including search, detail, media, and export, not only in the UI.
- Use correct HTTP status and content types, useful validation errors, and stable ordering for paginated search. Keep old API contracts backward compatible where practical; migrate every caller if an intentional change is unavoidable.

### User experience

- Anonymous: discover/search published datasets with text, scientific keywords/tags, regions/stations, expedition/voyage details, and observation availability where stored. Filters should combine, be shareable in URL state where current conventions support it, and provide loading, empty, error, and reset states.
- Detail: show persisted metadata needed to understand and cite the dataset, link to expedition/location/keywords, show only publicly available ready files, and provide PDF/XML exports.
- Submitter: clear registration/activation, create metadata first, add a file later, view own records and status, respond to changes requested, and perform permitted updates/replacements. Show upload/processing/failure/retry states with useful feedback. Never imply an operation succeeded until the backend confirms it.
- Staff: use existing role-protected screens/patterns to review, request changes, reject, approve/publish, or withdraw as allowed. Show the record and review history; require a comment where the transition rules require one.
- Accessibility: labeled fields, keyboard operation, visible focus, responsive layout, status announcements, and field-level validation that does not rely on color alone.

### Metadata exports

- Generate PDF and XML from the same persisted, authorized dataset representation used by public detail. Use installed project dependencies where possible; avoid bringing in a large library without need.
- XML must be valid, escaped, deterministic, and versioned with a documented schema/namespace. PDF must be readable and include record identity, relevant metadata, provenance/citation where available, and publication information. Do not expose internal review notes, private paths, or non-public records.
- Return correct content type and safe deterministic filenames. Add focused tests for XML escaping/well-formedness, deterministic output, PDF response shape, and access control.

## Milestones: finish each before starting the next

1. **Audit and plan:** code-backed gap matrix that distinguishes complete, partial, and missing; trace each existing route from UI through proxy to backend and persistence. Record public exposure, ownership and status behavior. No code edits in this milestone.
2. **Domain and persistence:** design separate ingestion and publication state dimensions; define transition rules, ownership, review event history, and replacement/version semantics. Add a reversible Alembic migration and test backfill against a copy/fixture of existing data.
3. **Backend hardening:** implement domain rules and ownership on existing endpoints; secure activation delivery; harden public serializers/filters/media; fix existing XML/PDF exports. Add missing APIs only after proving an operation is absent.
4. **Frontend integration:** fix and extend existing `/submitter` pages and current discovery/detail pages; add staff review UX only if no existing dataset review UI covers it. Use actual API responses through the existing proxy, with loading/error/empty/permission states.
5. **Operations and verification:** configuration/docs/deployment, focused tests, run relevant existing checks, migration rehearsal, complete diff review, fix issues.

At each milestone, report briefly what changed, relevant files, and checks/results. Do not leave stubs or TODOs for required workflow paths. If blocked on a genuinely policy-dependent decision, ask one specific question after finishing independent milestones.

## Required verification

Inspect `package.json`, Python dependencies, test layout, CI, Docker/Compose, Render/deployment scripts, and actual database support to choose commands. Add focused tests for the changed workflow, including at minimum:

- public cannot read/search/export pending, rejected, withdrawn, or otherwise non-public records;
- ingestion worker transitions (`processing` to `ready`/`failed`) cannot change dataset review/publication state, and review transitions cannot falsely mark a file as ingested;
- owner can manage own submission; another submitter cannot read/update/upload/review it; authorized staff can perform only allowed actions;
- invalid lifecycle transitions fail and valid transitions record actor/time/comment;
- inactive account cannot authenticate; activation is expiring and single-use; no role escalation;
- metadata can be submitted before upload; later upload binds to the same record; failed processing is visible/retryable as safely supported;
- dataset review history records actor, action, timestamp, and comment without reusing or corrupting unrelated editorial history;
- replacement failure leaves prior valid file and database references usable;
- filters/pagination and observation/voyage discovery use real fields;
- PDF/XML response headers, deterministic output, escaping, and authorization;
- migration works from the current supported schema and preserves existing published data.

Also add regression tests for existing submitter and export routes; do not write tests only for newly invented endpoints while leaving current routes unverified.

Run focused backend checks, then relevant backend suite; run frontend lint/build/type checks that the repo actually supports. Do not add/run unrelated tests. If a service is unavailable, report the exact command and reason; do not claim it passed. Review `git diff` and `git status` at the end to ensure no unrelated user changes were lost and no secrets/generated artifacts were added.

## Completion report format

Return:

1. What was already present and what gaps were closed.
2. Architecture and lifecycle decisions, including any configurable assumptions.
3. Changed files and migration/deployment steps.
4. Exact verification commands and their results.
5. Known limitations, external configuration still required, or unresolved policy decisions.

Do not claim “bug free.” State only what was implemented and verified.

# Antigravity Prompt: NPDC Dataset Portal Gaps

Copy the prompt below into Antigravity while this repository is open.

---

You are working in the existing Polar Portal repository, a FastAPI backend and Next.js frontend. Implement the missing end-to-end dataset discovery, submission, and submitter workflow described in `National_Polar_Data_Center.pdf`, while preserving the product and architecture already in this repo.

## Source and interpretation

Treat `National_Polar_Data_Center.pdf` as a functional reference describing the National Polar Data Center (NPDC) user workflows. It is not a mandate to copy the NPDC website's visual design, scrape its site, claim official affiliation, or invent NCPOR policies or data. Implement these capabilities in this existing Polar Portal. Keep the existing branding, technology, auth model, routes, data, and UX coherent.

The manual describes these user-facing capabilities:

- General/public users can search and browse datasets without registering.
- Search includes free text, scientific keywords, locations/regions/stations, observation data availability, and scientific voyage details.
- Dataset records show useful metadata and can be exported in human-readable PDF and machine-readable XML.
- Expedition-affiliated registered submitters can submit metadata, upload actual or processed data later, see a dashboard, and update their records/files.
- Submitted records become publicly visible only after the configured review/approval process.
- The reference describes registration with email and subsequent account activation. Implement secure self-registration and a real activation flow only using a configured email mechanism; if email is not configured, fail safely with a clear configuration/UX path rather than pretending an activation email was sent.

Do not assume details absent from the PDF (for example metadata fields, retention rules, file limits, allowed user affiliations, public license, or review authority). Inspect existing code and use the smallest safe, configurable defaults. Clearly document any choices.

## Repository instructions - required

1. Read `AGENTS.md`, `HANDOFF.md`, and inspect `git status` and the full diff before editing. Preserve all existing user changes and unrelated work.
2. The repo's `AGENTS.md` requires you to read the relevant guide under `node_modules/next/dist/docs/` before writing any Next.js code. Find and read the guide relevant to the app-router/forms/server-client patterns you touch; obey any deprecation notices.
3. Inspect the actual frontend, backend, models, migrations, auth/security, storage/ingestion, proxy, configuration, Docker setup, and existing checks. Do not infer implementation from README alone.
4. Do not replace the current stack, introduce a cloud AI/storage dependency, or add an external service without a concrete need and configuration.

## Verify gaps before implementing

The repo already appears to have many related capabilities. Verify each against the implementation and label it **complete**, **partial**, or **missing** before changing it:

- Anonymous asset catalogue and hybrid search.
- Existing region, station, expedition, year, type, and tag filters.
- Tags/scientific keyword browsing.
- Expedition model and detail/search support.
- Asset metadata detail page and structured metadata storage.
- Staff asset creation/editing and version history.
- File upload, asynchronous ingestion, processing/failure states, retry, and storage.
- Authentication, admin-created users, and role-based authorization.

Likely gaps to investigate carefully include self-service registration and activation, submitter ownership/authorization, a submission/review/publication lifecycle for datasets, a submitter dashboard, delayed file uploads/replacements with safe audit/version handling, dedicated observation-availability and scientific-voyage discovery UX, and PDF/XML metadata export. Do not duplicate working features. Add only what's needed to close verified gaps and connect each feature across UI, API, persistence, authorization, and deployment/configuration.

## Required workflow

Work in coherent milestones and finish each one before moving on. Start with a read-only audit and write/update a brief implementation plan in `HANDOFF.md` or another appropriate existing project document. Then implement the complete required workflow; do not stop after a plan or frontend mockup. If one genuinely policy-dependent choice blocks safe implementation, implement independent work first and ask one precise question for that blocker.

At each milestone:

1. Make a small, cohesive change spanning the necessary layers.
2. Add or update database migrations (never rely on `create_all` for deployed schema changes).
3. Wire real frontend screens/forms to the backend using the existing same-origin API proxy/auth conventions; no success-looking mock responses for real workflows.
4. Add validation, authorization, useful failure/loading/empty states, and audit/version behavior where appropriate.
5. Run focused checks for changed code and fix failures before moving on.
6. Review the full diff, including migrations and existing dirty files.

## Functional acceptance criteria

### A. Discovery for general users

- Anonymous users can search published/approved datasets.
- Free-text search works with pagination and stable sort; scientific keywords/tags and location filters work against real stored fields and are discoverable in the UI.
- Provide clear discovery paths for observation datasets/data availability and scientific voyages, using existing expedition/asset data where possible. If a distinct observation-availability field is needed, model and validate it explicitly rather than faking it from unrelated fields.
- Filters combine correctly, have shareable URL state where consistent with the current app, and support empty, loading, error, and reset states.
- Draft, pending, rejected, processing, or otherwise non-public records/files never leak through public listing, detail, search, media, or export endpoints.

### B. Metadata and record exports

- Define/validate the dataset metadata fields based on existing project data and the manual's intent. Keep flexible extension metadata only where needed; provide labels/help text and validation.
- Public detail pages show the metadata needed to understand and cite the dataset and link to its expedition, location, keywords, and available files.
- Provide valid downloadable PDF and XML metadata exports for a dataset. XML must be well-formed, escaped, deterministic, and have a documented schema/namespace/version. PDF must be readable and include record identity, metadata, status/publication information as appropriate, and provenance/citations where available.
- Exports are generated from the same authorized persisted record and have correct content type, filename, and error handling. Add focused tests for escaping, deterministic output, and access control.

### C. Registration, activation, and roles

- Add self-registration for submitter accounts without allowing users to choose privileged roles. Use normalized unique email, strong password hashing, rate limiting, generic anti-enumeration responses where appropriate, and secure expiring single-use activation tokens (store token hashes, not raw tokens).
- New accounts are inactive/unverified until activation; privileged roles remain admin-controlled. Ensure login/refresh/current-user reject inactive users.
- Implement email delivery via an optional configurable provider consistent with the existing deployment. Never log tokens/passwords, claim email delivery when disabled, or expose secrets to frontend. Add local-development-safe setup and deployment documentation.
- Keep public discovery anonymous. Protect submitter data so users can edit/manage only their own submissions unless an authorized staff role acts.

### D. Dataset submission and dashboard

- Provide a clear registered submitter flow for creating a dataset record with metadata before the data file is ready.
- Allow later upload of actual/processed data tied to the same record, with file type/content/size checks, storage failure handling, ingestion status, retry where safe, and clear progress feedback.
- Give submitters a dashboard showing their drafts, pending review, action required/rejected, published, and processing/failed upload states; allow permitted metadata edits and versioned file/metadata replacement.
- Implement explicit server-enforced state transitions and ownership checks. At minimum support draft/submitted, under review, changes requested/rejected, approved/published, and withdrawn/archive states as appropriate to existing patterns. Only approved/published datasets are public. Do not auto-publish.
- Provide staff review actions using existing admin/editor/reviewer roles where appropriate, record reviewer/action/timestamps/comments, and prevent invalid transitions. Reuse existing workflow patterns without conflating outreach stories with datasets.

### E. Safety, accessibility, and data integrity

- Authorization must be enforced on the backend, not only by hiding frontend controls.
- Preserve audit/version history; make file replacement atomic or recoverable, and do not orphan/delete old files before the database update succeeds.
- Validate foreign keys, dates, metadata size/shape, uploads, identifiers, and pagination. Avoid path traversal, unsafe filenames, content-type trust, and leaking private file URLs.
- Use accessible labels, keyboard-operable forms/tables/dialogs, status announcements, responsive layouts, and understandable validation errors.
- Keep APIs backward compatible where practical. If a breaking change is necessary, migrate all callers and document it.

## Verification and completion report

Inspect `package.json`, Python dependencies, existing test layout, and CI/deployment scripts to identify the project's real checks. Add focused automated tests for the new backend workflows and frontend build/lint/type checks; do not claim checks pass unless run. Run relevant checks after each milestone and at the end. If an environment/service is unavailable, state exactly what could not run and why; do not hide failures.

Before finishing:

- Review all changed files and the final `git diff`; confirm pre-existing user changes remain intact.
- Confirm migrations apply from the current schema on the supported database setup.
- Verify end-to-end paths: registration/activation, login, submit metadata, later upload, review, publication, public search/detail, and PDF/XML export; verify unauthorized ownership access and non-public data leakage are denied.
- Update README/config docs and `.env.example` for any new setting without adding secrets.
- Report what was already present, what was added, migration/deployment notes, exact checks run and results, and any remaining policy decisions or external setup.

Do not promise zero errors. Keep the implementation reviewable, evidence-based, and complete across frontend, API, persistence, auth, storage, tests, and docs.

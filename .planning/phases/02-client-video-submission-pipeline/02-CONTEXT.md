# Phase 2: Client Video Submission Pipeline - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers client-side video submission and client-only submission history. Scope includes upload flow UX, required metadata capture (exercise label + optional note), persisted submission statuses (`uploaded`, `ready_for_review`, `feedback_sent`), and history visibility restricted to the owning client. This phase does not include trainer review UI, timestamp comments, summary authoring, voice note upload by trainers, or notification delivery.

</domain>

<decisions>
## Implementation Decisions

### Submission Flow UX
- Submission entry lives on the client submissions surface (`/client/submissions`) rather than a detached wizard flow.
- Client submission uses a single form submit: file + exercise label + optional note in one action.
- Upload UX must show inline progress/state messaging and block duplicate submissions while transfer is in-flight.
- On upload failure, keep form inputs (label and note), show actionable error messaging, and support immediate retry in-place.

### Exercise Label Model
- Use controlled exercise labels with an "Other" option.
- Label picker should be searchable to support both mobile and desktop workflows as label sets expand.
- If "Other" is selected, custom label text is required.
- Persist canonical label key plus display label value to maintain consistency for downstream review/reporting.

### History and Status Behavior
- Client history defaults to a single newest-first reverse chronological list.
- Each history row shows key metadata: submitted timestamp, exercise label, status badge, and optional note preview.
- After successful upload + metadata persistence, submissions auto-transition to `ready_for_review`.
- History should load an initial batch with explicit "Load more" pagination behavior (not infinite scroll).

### File Constraints and Validation
- Accept `mp4` and `mov` formats in Phase 2.
- Enforce a 500 MB max upload size.
- Duration policy uses soft warning (for long videos) rather than hard rejection.
- Apply validation in both client and server layers: fast pre-check UX + server-side enforcement as source of truth.

### Claude's Discretion
- Exact visual styling for status badges, progress indicators, and row density polish.
- Initial controlled exercise label catalog contents.
- Exact warning threshold text/copy for long-duration uploads.
- Non-functional tuning details (batch size for "Load more", debounce, and minor UX micro-interactions).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/dev/local-runtime.ts`: existing in-memory runtime pattern can be extended with submission records for local/manual testing.
- `src/app/api/invites/*.ts` + `src/app/api/auth/*.ts`: route handlers already support dual payload modes (JSON + form-data-like workflows) with deterministic error mapping.
- `src/features/relationships/selectors.ts`: existing client navigation already points to `/client/submissions`, creating a ready integration anchor.
- `docs/seed/supabase_mvp1_schema_and_rls.sql`: defines `submission_status` enum, `video_submissions` table, and `videos` storage bucket/policies that align directly with this phase.

### Established Patterns
- Role and ownership boundaries are enforced via role cookies + guarded surfaces; Phase 2 must preserve client-only history visibility.
- Domain logic is service/repository driven, with factory registration and typed error codes used by route handlers.
- UI currently favors simple server-rendered pages with explicit state messaging and form-post workflows.

### Integration Points
- New client submission UI should attach to `/client/submissions` and connect from existing client dashboard action paths.
- Submission persistence integrates with `video_submissions` and corresponding RLS ownership constraints.
- Upload media paths should align with seed storage convention (`videos/<client_id>/<submission_id>/<filename>`).
- Status lifecycle produced in Phase 2 must cleanly hand off to Phase 3 trainer review and Phase 4/5 client feedback/notification phases.

</code_context>

<specifics>
## Specific Ideas

- Keep the flow low-friction: one clear submission page and one clear submit action.
- Maintain explicit status messaging throughout upload and history experiences (no ambiguous silent states).
- Prioritize reliability and clarity over advanced interactions for pilot usage.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 02-client-video-submission-pipeline*
*Context gathered: 2026-03-10*

---
phase: 01-identity-and-coaching-relationships
plan: 02
subsystem: api
tags: [invites, rls, zod, nextjs, email]
requires:
  - phase: 01-01
    provides: role-gated auth routing and trainer/client identity split
provides:
  - "Invite persistence model with 7-day expiry and one-pending-invite uniqueness"
  - "Trainer-only send/resend invite APIs with deterministic error responses"
  - "Guided invite acceptance path for linking a client to exactly one trainer"
affects: [01-03, phase-2-submissions]
tech-stack:
  added: []
  patterns: [dependency-injected invite service, tokenized invite lifecycle, email sender registration hooks]
key-files:
  created:
    - supabase/migrations/20260309_phase1_invites.sql
    - src/features/invites/schemas.ts
    - src/features/invites/service.ts
    - src/app/api/invites/send/route.ts
    - src/app/api/invites/resend/route.ts
    - src/app/api/invites/accept/route.ts
    - src/app/invite/[token]/page.tsx
    - src/services/email/invite-template.ts
  modified: []
key-decisions:
  - "Enforced resend semantics by refreshing token/expiry on a single pending invite record per trainer+email."
  - "Kept invite business logic in a repository-driven service to support Supabase-backed transactional adapters."
  - "Abstracted email sending behind registration hooks so delivery provider wiring stays outside route handlers."
patterns-established:
  - "Invite APIs validate payloads and map service errors to deterministic HTTP status + code responses."
  - "Invite acceptance supports both JSON and form posts for guided route compatibility."
requirements-completed: [RELA-01, RELA-02]
duration: 7min
completed: 2026-03-09
---

# Phase 01 Plan 02: Invite Lifecycle Summary

**Trainer invite send/resend lifecycle with token expiry, guided acceptance route, and one-trainer-per-client linking guards**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-09T23:45:43Z
- **Completed:** 2026-03-09T23:52:17Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Added invite persistence SQL with normalized email constraints, expiry window checks, and unique pending invite semantics.
- Implemented invite service logic for send/resend/accept with role checks and conflict protection.
- Added guided invite acceptance UI route and trainer/client invite API handlers with deterministic response contracts.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add invite persistence model and validation schema** - `8cc522c` (feat)
2. **Task 2: Implement trainer invite send/resend server flows** - `dddaeb6` (feat)
3. **Task 3: Implement guided invite acceptance path** - `44a9069` (feat)

_Note: Additional correctness fix was committed after task execution to support transactional acceptance hooks._

## Files Created/Modified
- `supabase/migrations/20260309_phase1_invites.sql` - Invite lifecycle persistence, constraints, indexes, and RLS policies.
- `src/features/invites/schemas.ts` - Zod invite payload and record schemas.
- `src/features/invites/service.ts` - Invite issuance, resend refresh, token validation, and acceptance/linking orchestration.
- `src/app/api/invites/send/route.ts` - Trainer-only invite send endpoint.
- `src/app/api/invites/resend/route.ts` - Trainer-only invite resend endpoint.
- `src/app/api/invites/accept/route.ts` - Client invite acceptance endpoint with auth guidance.
- `src/app/invite/[token]/page.tsx` - Guided invite landing page and accept action surface.
- `src/services/email/invite-template.ts` - Invite email template + sender abstraction.

## Decisions Made
- Kept send and resend as separate endpoints, but both enforce one-active-invite semantics by refreshing existing pending records.
- Used tokenized invite links with strict role checks (`trainer` for send/resend, `client` for accept).
- Added provider registration hooks (`registerInviteServiceFactory`, `registerInviteEmailSender`) to keep runtime wiring environment-specific.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added transactional acceptance extension point**
- **Found during:** Task 3 verification
- **Issue:** Initial acceptance flow linked relationship and consumed invite in sequential calls without an explicit transactional adapter hook.
- **Fix:** Added `activateLinkFromInvite` repository method support so adapters can perform consume+link atomically.
- **Files modified:** `src/features/invites/service.ts`
- **Verification:** Service now prioritizes repository-level atomic transition and falls back only for non-transactional local adapters.
- **Committed in:** `ab1e8e8` (fix)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Improved correctness for concurrent acceptance without scope creep.

## Issues Encountered
- Integration tests could not be executed because this workspace currently has no runnable package/test harness configured.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Relationship and invite lifecycle primitives are available for trainer/client landing surfaces in `01-03`.
- `01-03` can now consume pending invite and active-link state patterns for role-specific dashboards.

---
*Phase: 01-identity-and-coaching-relationships*
*Completed: 2026-03-09*
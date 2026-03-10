---
phase: 01-identity-and-coaching-relationships
plan: 03
subsystem: ui
tags: [relationships, dashboards, role-gating, nextjs]
requires:
  - phase: 01-01
    provides: middleware role redirects and auth route boundaries
  - phase: 01-02
    provides: invite lifecycle and acceptance state model
provides:
  - "Trainer landing overview for active clients and pending invites"
  - "Client landing status view for active, pending, and unlinked relationship states"
  - "Dismissible role-notice banner wired to middleware notice tokens"
affects: [phase-2-submissions, phase-3-review]
tech-stack:
  added: []
  patterns: [query service + selector split, role-aware landing composition, notice token consumption]
key-files:
  created:
    - src/features/relationships/queries.ts
    - src/features/relationships/selectors.ts
    - src/app/trainer/page.tsx
    - src/app/client/page.tsx
    - src/components/relationship/ActiveClientsTable.tsx
    - src/components/relationship/PendingInviteState.tsx
    - src/components/navigation/RoleNoticeBanner.tsx
  modified: []
key-decisions:
  - "Split relationship data reads from UI selectors to keep dashboard rendering logic deterministic and testable."
  - "Used cookie-based role context on landing pages to align with existing middleware guard pattern."
  - "Made redirect notices dismissible and removed query tokens from URL to prevent stale notice persistence."
patterns-established:
  - "Landing pages fail gracefully when relationship service adapters are not yet registered."
  - "Notice handling is centralized in a single reusable client component consumed by both roles."
requirements-completed: [RELA-03]
duration: 2min
completed: 2026-03-09
---

# Phase 01 Plan 03: Relationship Landing Summary

**Role-specific trainer and client landing dashboards with normalized relationship states and one-time redirect notices**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-10T02:08:32Z
- **Completed:** 2026-03-10T02:10:58Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added relationship query + selector helpers to normalize active, pending, and unlinked states.
- Implemented trainer and client landing pages with clear status messaging and relationship visibility.
- Added dismissible role notice banner integration so middleware redirect reasons are explicit and non-sticky.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build relationship query/select helpers for landing views** - `602ad52` (feat)
2. **Task 2: Implement trainer and client landing pages** - `0510932` (feat)
3. **Task 3: Add role-notice banner integration for redirect outcomes** - `6a5f459` (feat)

## Files Created/Modified
- `src/features/relationships/queries.ts` - Role-aware relationship read API and factory registration hooks.
- `src/features/relationships/selectors.ts` - Client and trainer UI selector helpers for normalized status rendering.
- `src/app/trainer/page.tsx` - Trainer landing page showing active client and pending invite overview.
- `src/app/client/page.tsx` - Client landing page showing connection state and guidance action.
- `src/components/relationship/ActiveClientsTable.tsx` - Active client list rendering for trainer overview.
- `src/components/relationship/PendingInviteState.tsx` - Pending invite list rendering and empty state messaging.
- `src/components/navigation/RoleNoticeBanner.tsx` - Dismissible auth/permission redirect notice UI.

## Decisions Made
- Kept relationship query logic in a domain module and UI interpretation in selectors to avoid page-level branching sprawl.
- Used one shared `RoleNoticeBanner` for both role pages to avoid divergence in redirect UX behavior.
- Treated unknown/unsupported notice values as no-op to prevent accidental banner leakage.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Automated tests were not executed because this workspace currently has no runnable package/test harness configured.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 1 relationship visibility criteria are implemented end-to-end for both roles.
- Phase 2 can build submission flows directly on top of the trainer/client landing surfaces.

---
*Phase: 01-identity-and-coaching-relationships*
*Completed: 2026-03-09*
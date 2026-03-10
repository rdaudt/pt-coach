# Phase 2: Client Video Submission Pipeline - Research

**Researched:** 2026-03-10
**Domain:** Next.js App Router + Supabase-backed client video upload and history workflow
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Submission entry is `/client/submissions`.
- Client uses a single-submit flow (file + exercise label + optional note).
- Upload UX must show inline progress and prevent duplicate in-flight submits.
- Failed uploads keep entered metadata and allow immediate retry in-place.
- Exercise labels use controlled list + required custom text for `Other`.
- Label picker should be searchable.
- Persist label as canonical key + display value.
- History is newest-first with key metadata rows.
- Submission status auto-transitions to `ready_for_review` after successful persistence.
- History uses explicit "Load more" behavior.
- Accepted file formats are MP4 and MOV.
- Max upload size is 500 MB.
- Duration limit is a soft warning, not hard block.
- Validation must happen client-side and server-side.

### Claude's Discretion
- Final visual styling and micro-interactions for progress/status.
- Initial controlled exercise catalog values.
- Exact duration warning threshold copy/details.
- Load-more page size and related UX tuning.

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

<research_summary>
## Summary

Phase 2 should implement a reliable client-only submissions vertical slice with strict ownership boundaries and deterministic status handling. The seed schema already defines submission lifecycle primitives (`uploaded`, `ready_for_review`, `feedback_sent`), metadata columns (`duration_seconds`, `file_size_bytes`, `client_note`), and RLS policies that constrain inserts to authenticated clients linked to a trainer.

The safest architecture is a two-step persistence flow:
1. Validate file + metadata (client pre-check, server authoritative checks)
2. Persist storage object + submission record atomically at application level (with cleanup on partial failure)

For MVP reliability, keep the history view server-rendered with explicit pagination ("Load more"), and use service/repository boundaries like Phase 1 to avoid coupling UI directly to persistence details.

**Primary recommendation:** Build Phase 2 around explicit upload contracts and ownership-safe history queries, while preserving a simple single-submit UX.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 15.x | Client page + API routes | Already established in repo and Phase 1 patterns |
| Supabase Postgres + Storage + RLS | Managed | Submission metadata + private media storage | Existing seed schema/policies match Phase 2 requirements |
| Zod | 4.x | Payload/file metadata validation | Already used in project service/route contracts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | 2.x | Storage/object + DB operations | Required when wiring real Supabase adapters |
| Vitest | 3.x | Service and selector tests | Validate status transitions, ownership filters, and validation guards |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Controlled + searchable labels | Free-text labels only | Faster UI, weaker downstream consistency |
| "Load more" pagination | Infinite scroll | Smoother UX, more state complexity and edge cases |
| Client+server validation | Server-only validation | Simpler implementation, poorer UX feedback timing |

**Installation (real adapter phase):**
```bash
npm install @supabase/supabase-js
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
src/
|-- app/
|   `-- client/
|       `-- submissions/
|           `-- page.tsx
|-- app/api/
|   `-- submissions/
|       |-- create/route.ts
|       `-- history/route.ts
|-- features/
|   `-- submissions/
|       |-- schemas.ts
|       |-- service.ts
|       |-- queries.ts
|       `-- selectors.ts
`-- services/
    `-- storage/
        `-- upload.ts
```

### Pattern 1: Contract-First Submission Service
**What:** Route handlers delegate to a typed submission service with repository/storage interfaces.
**When to use:** Create submission, history reads, and status transition logic.
**Example:** `SubmissionService.createSubmission(clientId, payload, file)` returns normalized status and ids.

### Pattern 2: Ownership-Bound History Query
**What:** History fetch always scopes by authenticated client id.
**When to use:** `/client/submissions` list and any list pagination API.
**Example:** `WHERE client_id = auth.uid()` + ordered newest-first.

### Pattern 3: Application-Level Two-Step Consistency
**What:** Upload object, then create DB record; if DB step fails, cleanup orphaned object.
**When to use:** Single-submit upload path before background processing exists.
**Example:** try upload -> try insert -> catch insert failure -> delete uploaded object.

### Anti-Patterns to Avoid
- Mixing trainer review concerns into Phase 2 submission contracts.
- Relying on client-provided status rather than server-assigned transitions.
- Returning full unpaginated history with growing record sets.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File validation | Ad hoc regex/file checks in many places | Shared Zod schemas + centralized server guard | Prevents drift between client/server behavior |
| Storage auth | Public object URLs for private videos | Supabase Storage bucket policies (`videos`) | Preserves privacy and trainer/client access boundaries |
| Status lifecycle | Client-driven status mutation | Server-owned transition rules | Prevents invalid state graphs |

**Key insight:** Upload flows fail most often at boundary contracts (size/type/state ownership), not UI rendering; centralize those contracts.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Orphaned file objects
**What goes wrong:** Upload succeeds but DB record fails, leaving inaccessible storage objects.
**Why it happens:** No cleanup path on partial failure.
**How to avoid:** Wrap create flow with compensating delete on metadata insert failure.
**Warning signs:** Storage growth without matching submission rows.

### Pitfall 2: Duplicate submissions on retries
**What goes wrong:** Double-click/retry creates duplicate records for one intended upload.
**Why it happens:** No in-flight guard or idempotency strategy.
**How to avoid:** UI disable during upload + optional request id on server.
**Warning signs:** Near-identical timestamps and metadata duplicates.

### Pitfall 3: Cross-client history leakage
**What goes wrong:** Client sees submissions not owned by them.
**Why it happens:** Missing ownership predicate in query layer or route.
**How to avoid:** Enforce owner id in service query and align with RLS constraints.
**Warning signs:** Any history result where `client_id != authenticated user`.
</common_pitfalls>

<code_examples>
## Code Examples

### Submission schema (pseudo)
```typescript
const createSubmissionSchema = z.object({
  exercise_key: z.string().min(1),
  exercise_label: z.string().min(1),
  client_note: z.string().max(1000).optional(),
});
```

### Server-side status assignment
```typescript
const status = "ready_for_review"; // server decided after successful save
```

### History query contract
```typescript
repository.listByClient({
  clientId,
  limit,
  cursor, // for load-more behavior
  order: "uploaded_at_desc",
});
```
</code_examples>

<sota_updates>
## State of the Art (2024-2025)

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Large synchronous form posts only | Resumable/direct storage upload + metadata contracts | Better reliability for larger mobile videos |
| Flat free-text taxonomies | Controlled vocab + escape hatch (`Other`) | Better analytics/review consistency |
| Infinite-scroll by default | Explicit pagination for operational clarity | Easier debugging and deterministic UX |

**Applicable now:** Controlled metadata + deterministic state transition model is sufficient for MVP before async processing layers are introduced.
</sota_updates>

## Validation Architecture

- **Dimension focus:** upload reliability, metadata correctness, status transition correctness, and ownership-safe history visibility.
- **Plan-level test strategy:** each plan should include automated tests for schema validation, status assignment, and history scoping.
- **Wave-0 expectation:** existing Vitest harness is present; add submission-focused tests early in Phase 2 work.
- **Release gate for Phase 2:** cannot pass unless client-only history boundary and status lifecycle behavior are verified.

<open_questions>
## Open Questions

1. **Exercise catalog source**
   - What we know: requires controlled labels with searchable selection + `Other`.
   - What's unclear: seed source and update path for initial label set.
   - Recommendation: seed a small static catalog in code for Phase 2; externalize in later phase if needed.

2. **Duration warning threshold**
   - What we know: soft warning required.
   - What's unclear: exact threshold value and wording.
   - Recommendation: pick an initial threshold (for example, 10 minutes) and keep as configurable constant.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `.planning/phases/02-client-video-submission-pipeline/02-CONTEXT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `docs/seed/supabase_mvp1_schema_and_rls.sql`
- `src/features/dev/local-runtime.ts`
- `src/app/api/auth/*.ts`, `src/app/api/invites/*.ts`

### Secondary (MEDIUM confidence)
- `docs/seed/system_architecture_evolution.md`
- `docs/seed/prd_mvp1.md`

### Tertiary (LOW confidence - needs validation)
- None used
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Next.js + Supabase storage/DB boundaries for client uploads
- Patterns: service/repository contracts, ownership queries, deterministic statuses
- Risks: orphan uploads, duplicate submissions, cross-client leakage

**Confidence breakdown:**
- Standard stack: HIGH
- Architecture patterns: HIGH
- Pitfalls: HIGH
- Code examples: MEDIUM (finalized during planning implementation)

**Research date:** 2026-03-10
**Valid until:** 2026-04-09 (30 days)
</metadata>

---

*Phase: 02-client-video-submission-pipeline*
*Research completed: 2026-03-10*
*Ready for planning: yes*

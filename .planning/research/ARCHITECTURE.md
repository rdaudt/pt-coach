# Architecture Research

**Domain:** Video coaching platform for personal trainers and clients
**Researched:** 2026-03-09
**Confidence:** HIGH

## Standard Architecture

### System Overview

```text
+-------------------------------------------------------------+
|                 Web Application Layer (Next.js)             |
|-------------------------------------------------------------|
| Trainer UI | Client UI | Route Handlers | Server Actions   |
+---------------------+-------------------+-------------------+
                      |                   |
+---------------------v-------------------v-------------------+
|               Application Service Layer                     |
|-------------------------------------------------------------|
| Auth Context | Submission Service | Feedback Service        |
| Notification Orchestrator | Branding Service                |
+---------------------+-------------------+-------------------+
                      |                   |
+---------------------v-------------------v-------------------+
|                Data and Media Layer                         |
|-------------------------------------------------------------|
| Supabase Postgres (RLS) | Supabase Storage (private)       |
| Supabase Auth | Email Provider (Resend/Postmark)           |
+-------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Web app (Next.js) | Role-specific UI and request handling | App Router pages/layouts + route handlers + server actions |
| Access control layer | Enforce trainer/client object ownership | Centralized policy checks mapped to RLS constraints |
| Submission service | Upload lifecycle and statuses | DB status transitions: uploaded -> ready_for_review -> feedback_sent |
| Feedback service | Timestamp comments, summary, voice metadata | Structured feedback tables and transactional updates |
| Notification service | Event-driven email triggers | Trigger on submission/feedback status changes |
| Media storage layer | Private media persistence | Supabase Storage buckets + signed URL access patterns |

## Recommended Project Structure

```text
src/
|-- app/                    # Next.js App Router entrypoints
|   |-- (auth)/             # Auth routes
|   |-- trainer/            # Trainer-facing screens
|   |-- client/             # Client-facing screens
|   `-- api/                # Route handlers
|-- features/               # Business modules by domain
|   |-- auth/
|   |-- submissions/
|   |-- feedback/
|   |-- trainer-profile/
|   `-- notifications/
|-- services/               # External integrations and orchestration
|   |-- supabase/
|   |-- storage/
|   `-- email/
|-- lib/                    # Shared utilities and schemas
|   |-- authz/
|   |-- validation/
|   `-- dates/
`-- tests/                  # E2E and integration tests
```

### Structure Rationale

- **`features/` by domain:** keeps trainer/client flows modular and roadmap-friendly.
- **`services/` integration boundary:** allows gradual extraction of async workers later without rewriting domain logic.

## Architectural Patterns

### Pattern 1: Policy-First Data Access

**What:** Every data operation is validated by role/relationship constraints in both app logic and RLS.
**When to use:** All reads/writes touching client videos and feedback.
**Trade-offs:** Slightly more implementation ceremony, much lower risk of data leakage.

**Example:**
```typescript
// Pseudocode
assertCanAccessSubmission(userId, submissionId);
await db.updateSubmissionStatus(submissionId, "ready_for_review");
```

### Pattern 2: Explicit Workflow State Machine

**What:** Submission lifecycle modeled with explicit statuses and transition checks.
**When to use:** Upload, review, and feedback-send operations.
**Trade-offs:** Requires transition guards, but simplifies debugging and notification logic.

**Example:**
```typescript
// uploaded -> ready_for_review -> feedback_sent
```

### Pattern 3: Thin Async Boundary for Side Effects

**What:** User requests complete quickly; side effects (emails, thumbnailing later) run asynchronously.
**When to use:** Notification delivery and non-critical media tasks.
**Trade-offs:** Requires retry/idempotency handling but improves UX reliability.

## Data Flow

### Request Flow

```text
Client Upload Action
    ->
Upload Handler -> Submission Service -> Postgres + Storage
    <-                               <-
Upload Response   <- metadata/status persisted
```

### State Management

```text
Server data (React Query)
    <-> trainer/client components
      -> mutate via server actions/route handlers
        -> persist to Supabase
```

### Key Data Flows

1. **Submission intake:** client upload + metadata -> submission record + trainer notification trigger.
2. **Feedback loop:** trainer comments/summary/voice -> mark sent -> client notification -> client review view.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k active users | Keep monolith: Next.js + Supabase + managed email |
| 1k-100k users | Add async workers for media metadata/extract and notification reliability |
| 100k+ users | Split heavy processing into dedicated services, add queue orchestration and richer observability |

### Scaling Priorities

1. **First bottleneck:** upload reliability and media throughput - solve with async processing and retryable pipelines.
2. **Second bottleneck:** trainer dashboard query performance - solve with indexed queries/materialized views.

## Anti-Patterns

### Anti-Pattern 1: Mixing Auth Identity with Trainer Brand Domain

**What people do:** Store all trainer business profile data directly in auth user objects.
**Why it's wrong:** Limits evolution and creates awkward access/privacy rules.
**Do this instead:** Keep `profiles` and `trainer_profiles` separate, as in the seed schema.

### Anti-Pattern 2: Blob-Only Feedback Storage

**What people do:** Store all comments and summary inside one unstructured JSON/text blob.
**Why it's wrong:** Breaks timestamp UX, analytics, and future AI assistance.
**Do this instead:** Keep structured tables for comments, summary, and voice-note metadata.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | Token/session in server + client contexts | Enforce role checks and session refresh strategy |
| Supabase Storage | Signed URLs + private buckets | Never expose raw public URLs for private coaching media |
| Email provider (Resend/Postmark) | Event-triggered transactional emails | Ensure idempotent send logic for retries |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI <-> domain services | Server actions/route handlers | Keep validation and auth checks server-side |
| Domain services <-> data layer | Repository/service functions | Prevent direct UI access to raw DB queries |

## Sources

- `docs/seed/system_architecture_evolution.md`
- `docs/seed/prd_mvp1.md`
- https://nextjs.org/docs
- https://supabase.com/docs

---
*Architecture research for: video coaching platform*
*Researched: 2026-03-09*

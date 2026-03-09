# Phase 1: Identity and Coaching Relationships - Research

**Researched:** 2026-03-09
**Domain:** Next.js + Supabase authentication and relationship authorization
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Trainer sends client invites by email from inside the app.
- Invite acceptance should be guided: invite link opens a flow that supports sign up/sign in and links the client in one path.
- Invite links expire after 7 days.
- Re-inviting the same client should resend/refresh a single active invite, not create duplicates.
- First screen should split entry by role: "I am a Trainer" and "I am a Client."
- Trainer registration is open for MVP1 (not restricted to allowlist/admin creation).
- Client registration is invite-only for MVP1 to enforce one-trainer-per-client model.
- If user signs up with wrong role, role is fixed through support flow (no self-switch in MVP1).
- Trainer default landing page is a clients overview (active clients + pending invites).
- Client default landing page shows coach connection status.
- If client is unlinked/inactive, show explicit pending/no-link state with next-step guidance.
- If a user accesses a route for the other role, auto-redirect to correct home with a short permission notice.

### Claude's Discretion
- Exact copywriting for invite, expiry, and role-mismatch messages.
- Visual layout details of trainer/client landing screens.
- Precise UX pattern for support-contact flow (link, form, or email handoff).

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

<research_summary>
## Summary

Phase 1 should implement a strict identity/relationship foundation before any submission or feedback logic. The seed SQL already provides a strong baseline: role enum (`trainer`/`client`), trainer-client status lifecycle (`invited`, `active`, `inactive`), one-trainer-per-client uniqueness, and RLS policies for linked-only visibility.

The most reliable implementation pattern is: role-first onboarding UI -> Supabase Auth signup/signin -> profile record creation -> invite issuance/acceptance with tokenized flow -> relationship activation -> role-aware routing guards. Invite-only client onboarding should be enforced at both UI and server/API layer, not UI alone.

**Primary recommendation:** Build Phase 1 around the existing Supabase schema/RLS contract, and treat relationship state transitions as first-class workflow events.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | Route/UI/server actions | Single codebase with server-side auth checks and role-based routing |
| Supabase Auth + `@supabase/ssr` | 2.99.0 / 0.9.0 | Authentication and session handling | Established pattern for Next.js + Supabase auth lifecycle |
| Supabase Postgres + RLS | Managed | Authorization and relationship source of truth | RLS enforces data boundaries at DB layer, reducing leakage risk |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.3.6 | Request/input validation | Validate role, invite token payloads, and relationship transitions |
| React Hook Form | 7.71.2 | Signup/signin/invite forms | Form state + validation for role and invite flows |
| Resend (or Postmark) | 6.9.3 | Invite email delivery | Transactional invite sends with idempotent server-side triggering |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase RLS-centric authz | App-only permission checks | Faster to start, but higher risk of cross-tenant leakage |
| Tokenized invite links | Manual trainer-client linking UI | Lower engineering complexity but weaker guided onboarding |

**Installation:**
```bash
npm install @supabase/supabase-js @supabase/ssr zod react-hook-form resend
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
src/
|-- app/
|   |-- (auth)/                 # role-select, signup, signin
|   |-- trainer/                # trainer landing + invites + clients overview
|   |-- client/                 # client landing + coach connection state
|   `-- invite/[token]/         # guided invite accept flow
|-- features/
|   |-- auth/
|   |-- invites/
|   `-- relationships/
`-- lib/
    |-- authz/                  # role + relationship checks
    `-- validation/             # zod schemas
```

### Pattern 1: Role-Gated Route Entry
**What:** Every authenticated route checks role and redirects to correct landing.
**When to use:** All `trainer/*` and `client/*` routes.
**Example:**
```typescript
if (user.role !== "trainer") redirect("/client?notice=permission")
```

### Pattern 2: Invite Token + Transition Guard
**What:** Accept-invite endpoint validates token status/expiry and performs single transition `invited -> active`.
**When to use:** Invite accept flow and resend flow.
**Example:**
```typescript
// Guard: pending invite for email + not expired + not already active
```

### Anti-Patterns to Avoid
- **Auth-only checks without relationship checks:** allows valid users to view wrong trainer/client records.
- **Invite state in client-only memory:** causes race conditions and duplicate/invalid acceptance behavior.
- **Role mutability in MVP1:** increases authorization complexity and edge-case burden early.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session lifecycle | Custom JWT storage and refresh logic | Supabase Auth + SSR helpers | Prevents session inconsistency and security regressions |
| Role permissions | Ad hoc permission if/else across pages | Central `authz` checks + DB RLS | Keeps authorization logic auditable and consistent |
| Invite expiry security | Homegrown weak token format | Signed random tokens + DB expiry timestamp | Avoids predictable tokens and replay issues |

**Key insight:** Most auth and tenancy defects come from bypassing platform primitives that already solve hard edge cases.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Duplicate relationship records
**What goes wrong:** Multiple active invite/link records for same trainer-client pair.
**Why it happens:** No idempotent resend rule and weak uniqueness handling.
**How to avoid:** Enforce single pending/active relationship and refresh existing invite on resend.
**Warning signs:** Trainers see same client more than once or clients linked ambiguously.

### Pitfall 2: Cross-role route leakage
**What goes wrong:** Client can hit trainer pages or vice versa and see protected data shells.
**Why it happens:** UI hides links but server routes do not enforce role gates.
**How to avoid:** Route-level role guards with redirect + notice and server-side data checks.
**Warning signs:** URL typing reveals pages not meant for current role.

### Pitfall 3: Invite acceptance race conditions
**What goes wrong:** Expired or already-used invites still appear accepted in UI.
**Why it happens:** Acceptance flow not transactional or not checking current invite status.
**How to avoid:** Atomic DB transaction for token validation and status transition.
**Warning signs:** Intermittent "linked but no trainer data" states.
</common_pitfalls>

<code_examples>
## Code Examples

### Auth-aware route guard (server)
```typescript
// Source: project pattern (to implement in Next.js server layer)
if (!session) redirect("/login");
if (profile.role !== "trainer") redirect("/client?notice=permission");
```

### Invite acceptance transition (pseudo)
```typescript
// Source: seed schema constraints + relationship lifecycle
// 1) Validate invite token and expiry
// 2) Ensure client account exists/signs in
// 3) Upsert/transition trainer_clients to active
// 4) Invalidate invite token
```

### Relationship visibility check
```typescript
// Source: seed SQL helper intent
// Permit trainer access only when trainer_clients.status = 'active'
```
</code_examples>

<sota_updates>
## State of the Art (2024-2025)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| App-only auth checks | DB-backed policy + app checks | Ongoing (modern B2B/B2C SaaS) | Better tenant isolation and fewer data leakage bugs |
| Monolithic signup forms | Role-entry split onboarding | Recent UX trend | Reduces wrong-role registrations and support load |
| Long-lived invite links | Short expiry with resend | Common current pattern | Better security with manageable friction |

**New tools/patterns to consider:**
- SSR-friendly Supabase auth helpers for modern Next.js routing.
- Idempotent event handling for invite resend and acceptance operations.

**Deprecated/outdated:**
- Trusting client-side role data for authorization.
- Public invite links without expiry/revocation.
</sota_updates>

## Validation Architecture

- **Dimension focus:** identity correctness, relationship integrity, authorization boundaries, and deterministic routing by role.
- **Plan-level test strategy:** every plan should include automated verification for route guards, invite expiry, and one-trainer-per-client constraints.
- **Wave-0 expectation:** if no test harness exists, first plan should bootstrap auth/relationship integration tests before feature work completes.
- **Release gate for Phase 1:** cannot pass if any cross-role/cross-relationship access path remains unverified.

<open_questions>
## Open Questions

1. **Invite transport details**
   - What we know: invite is email-based with 7-day expiry and resend.
   - What's unclear: whether resend keeps same token or rotates token.
   - Recommendation: choose rotating token on resend for safer invalidation semantics.

2. **Support flow for wrong role**
   - What we know: role change is support-managed in MVP1.
   - What's unclear: exact support channel integration (form vs mailto).
   - Recommendation: implement lightweight support ticket/email handoff now, admin tooling later.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `docs/seed/supabase_mvp1_schema_and_rls.sql` - relationship model, RLS, helper functions, status lifecycle
- `docs/seed/prd_mvp1.md` - phase-aligned functional expectations
- `docs/seed/system_architecture_evolution.md` - stage-1 architecture boundaries
- https://supabase.com/docs - auth, SSR, RLS, storage security patterns

### Secondary (MEDIUM confidence)
- `docs/seed/product_vision_and_roadmap.md` - product sequencing and trainer-first constraints

### Tertiary (LOW confidence - needs validation)
- None used
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Supabase authz/authn with Next.js
- Ecosystem: invite lifecycle, role routing, relationship transitions
- Patterns: policy-first access control and status-driven workflows
- Pitfalls: leakage, duplicate relationships, invite race conditions

**Confidence breakdown:**
- Standard stack: HIGH - aligned to validated seed architecture and current package choices
- Architecture: HIGH - clear fit with phase scope and constraints
- Pitfalls: HIGH - directly tied to known SaaS auth/tenant failure modes
- Code examples: MEDIUM - representative patterns, final code shaped during planning

**Research date:** 2026-03-09
**Valid until:** 2026-04-08 (30 days - stable domain primitives)
</metadata>

---

*Phase: 01-identity-and-coaching-relationships*
*Research completed: 2026-03-09*
*Ready for planning: yes*

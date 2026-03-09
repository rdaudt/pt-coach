# Phase 1: Identity and Coaching Relationships - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers secure trainer/client authentication and one-to-one trainer-client relationship setup. This includes account creation/sign-in/sign-out/session persistence plus trainer invite and client acceptance flows. It does not include video submission, feedback authoring, notifications, or branding surfaces beyond what is needed for account/relationship setup.

</domain>

<decisions>
## Implementation Decisions

### Invite flow behavior
- Trainer sends client invites by email from inside the app.
- Invite acceptance should be guided: invite link opens a flow that supports sign up/sign in and links the client in one path.
- Invite links expire after 7 days.
- Re-inviting the same client should resend/refresh a single active invite, not create duplicates.

### Signup and role entry
- First screen should split entry by role: "I am a Trainer" and "I am a Client."
- Trainer registration is open for MVP1 (not restricted to allowlist/admin creation).
- Client registration is invite-only for MVP1 to enforce one-trainer-per-client model.
- If user signs up with wrong role, role is fixed through support flow (no self-switch in MVP1).

### Access surfaces after sign-in
- Trainer default landing page is a clients overview (active clients + pending invites).
- Client default landing page shows coach connection status.
- If client is unlinked/inactive, show explicit pending/no-link state with next-step guidance.
- If a user accesses a route for the other role, auto-redirect to correct home with a short permission notice.

### Claude's Discretion
- Exact copywriting for invite, expiry, and role-mismatch messages.
- Visual layout details of trainer/client landing screens.
- Precise UX pattern for support-contact flow (link, form, or email handoff).

</decisions>

<specifics>
## Specific Ideas

- Keep Phase 1 optimized for fast trainer workflow and low friction onboarding.
- Maintain one-trainer-per-client relationship behavior consistently across all Phase 1 states.
- Use explicit state messaging rather than blank pages for pending/unlinked scenarios.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docs/seed/supabase_mvp1_schema_and_rls.sql`: pre-defined `app_role`, `trainer_client_status`, and helper functions that align directly with Phase 1 behaviors.
- Existing seed schema includes `trainer_clients_client_unique` constraint, supporting the one-trainer-per-client MVP decision.

### Established Patterns
- Data model is status-driven (`invited`, `active`, `inactive`) rather than implicit state, which should be preserved in Phase 1 UX flows.
- Access model is role-aware and relationship-aware via RLS policy definitions; planner should keep UI paths consistent with those rules.

### Integration Points
- Auth entry and session behavior should connect to Supabase Auth + `profiles` table role mapping.
- Invite and acceptance flow should integrate with `trainer_clients` lifecycle (`invited` -> `active`).
- Post-login routing should branch by role and relationship status, feeding Phase 2/3 workflows later.

</code_context>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 01-identity-and-coaching-relationships*
*Context gathered: 2026-03-09*

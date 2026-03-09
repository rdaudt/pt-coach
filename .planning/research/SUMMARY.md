# Project Research Summary

**Project:** Video Coaching Portal
**Domain:** Video-first coaching workflow platform
**Researched:** 2026-03-09
**Confidence:** HIGH

## Executive Summary

Research confirms this product should be built as a focused, trainer-first workflow system rather than a general fitness platform in MVP1. The best path is a monolithic Next.js application on Vercel with Supabase for auth, relational data, row-level access control, and private media storage.

Feature expectations in this domain are clear: users expect secure role-based access, mobile upload, trainer review with timestamped feedback, and reliable notification loops. Your explicit priority of trainer review speed is consistent with adoption risk: if trainer turnaround slips, the product habit fails even if uploads are working.

The main risks are access-control defects, mobile upload friction, and operational reliability around feedback/notifications. Roadmap phases should sequence foundational auth/ownership first, then upload, review, and reliability hardening before expansion into AI and broader business tooling.

## Key Findings

### Recommended Stack

The recommended stack is Next.js + React + Supabase with strict policy-first access control and private media buckets. This aligns directly with seed architecture guidance and minimizes infrastructure overhead while preserving clean boundaries for later async workers and AI services.

**Core technologies:**
- **Next.js 16.1.6:** Product UI + server routes/actions in one deployable app
- **React 19.2.4:** Trainer/client interfaces and interaction patterns
- **Supabase 2.99.0 + Postgres/RLS/Storage:** Secure relational core for submissions, feedback, and media

### Expected Features

MVP1 should focus on table-stakes coaching workflow capabilities and avoid scope expansion.

**Must have (table stakes):**
- Role-based trainer/client auth and secure ownership boundaries
- Trainer-client linking and invite flow
- Mobile upload with exercise label + note
- Trainer timestamp comments + summary + voice note
- Client feedback view + notifications
- Trainer branding across dashboard/feedback/emails

**Should have (competitive):**
- Trainer turnaround visibility dashboard
- Exercise-specific feedback templates/cues

**Defer (v2+):**
- AI instant feedback and advanced analysis
- Multi-trainer org workflows and business operations tooling

### Architecture Approach

Use one Next.js codebase with domain modules and explicit service boundaries. Keep all sensitive operations behind server-side validation, map every access rule to RLS, and model submission lifecycle with explicit statuses.

**Major components:**
1. **Web app layer** - trainer/client UIs and route handlers
2. **Domain service layer** - submissions, feedback, notifications, branding orchestration
3. **Data/media layer** - Supabase Auth, Postgres, and private storage buckets

### Critical Pitfalls

1. **Cross-client data leakage** - prevent with policy-first service checks + RLS tests.
2. **Mobile upload abandonment** - prevent with resilient upload UX and progress/retry states.
3. **Trainer review backlog** - prevent with speed-first review UX and turnaround visibility.
4. **Notification trust erosion** - prevent with idempotent event sends and delivery observability.
5. **Storage cost creep** - prevent with file limits, retention decisions, and monitoring.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Access Foundations
**Rationale:** Security and relationship boundaries are prerequisites for every other capability.
**Delivers:** Auth, roles, trainer-client linkage, base navigation shells.
**Addresses:** Table-stakes security and ownership requirements.
**Avoids:** Cross-client data leakage pitfall.

### Phase 2: Client Submission Flow
**Rationale:** Submission is the start of the product loop and must work on mobile.
**Delivers:** Video upload flow, metadata capture, submission statuses.
**Uses:** Supabase storage + Postgres workflow status model.
**Implements:** Submission service architecture components.

### Phase 3: Trainer Review and Feedback
**Rationale:** This is the core value path and stated top priority (trainer speed).
**Delivers:** Playback, timestamp comments, summary feedback, voice note support, send action.
**Uses:** Structured feedback tables and voice media handling.
**Avoids:** Trainer backlog pitfall.

### Phase 4: Client Feedback Experience + Notifications
**Rationale:** Loop closure requires reliable delivery and clear client consumption.
**Delivers:** Client feedback pages, branded surfaces, email notifications, reliability checks.
**Uses:** Notification orchestration with idempotent sends.
**Avoids:** Notification trust erosion and partial workflow failures.

### Phase 5: Pilot Analytics + Hardening
**Rationale:** Validate adoption and tighten ops before AI stages.
**Delivers:** Turnaround metrics, upload completion tracking, basic operational dashboards.
**Uses:** Derived reporting queries and observability setup.
**Avoids:** Blind spots in product and operational decision-making.

### Phase Ordering Rationale

- Ownership/security and workflow state modeling must exist before media and feedback features.
- Upload and review are split so trainer speed can be optimized with dedicated focus.
- Reliability and analytics follow core loop completion to validate behavior before intelligent automation.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** Voice-note UX and media handling tradeoffs for low-friction trainer review.
- **Phase 4:** Notification reliability, retries, and event idempotency choices.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Auth + role-based access with Supabase is well documented.
- **Phase 2:** Standard upload and metadata flows are established patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Current versions verified from npm package registry and official docs |
| Features | HIGH | Strong alignment across seed docs and known product category expectations |
| Architecture | HIGH | Seed architecture is coherent and matches standard staged system evolution |
| Pitfalls | MEDIUM/HIGH | Highly consistent with domain patterns; exact thresholds require pilot telemetry |

**Overall confidence:** HIGH

### Gaps to Address

- **Concrete pilot targets:** define explicit thresholds for turnaround time and upload completion.
- **Email provider selection:** choose Resend vs Postmark and establish deliverability monitoring approach.
- **Video constraints:** finalize max file size, duration limits, and accepted formats for MVP1.

## Sources

### Primary (HIGH confidence)
- `docs/seed/prd_mvp1.md`
- `docs/seed/product_vision_and_roadmap.md`
- `docs/seed/system_architecture_evolution.md`
- `docs/seed/supabase_mvp1_schema_and_rls.sql`
- https://www.npmjs.com/package/next
- https://www.npmjs.com/package/react
- https://www.npmjs.com/package/@supabase/supabase-js
- https://nextjs.org/docs
- https://supabase.com/docs

### Secondary (MEDIUM confidence)
- Public market patterns from trainer coaching SaaS products (Trainerize, TrueCoach)

### Tertiary (LOW confidence)
- None used for core decisions

---
*Research completed: 2026-03-09*
*Ready for roadmap: yes*

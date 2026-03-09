# Pitfalls Research

**Domain:** Video coaching platform for personal trainers
**Researched:** 2026-03-09
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Cross-Client Data Leakage

**What goes wrong:**
Clients or trainers can access submissions that are not theirs due to incomplete ownership checks.

**Why it happens:**
Teams rely on UI-level filtering and skip defense-in-depth at query/storage policy level.

**How to avoid:**
Enforce ownership in app services and RLS policies; require relationship checks for every submission read/write.

**Warning signs:**
Authorization logic duplicated in many components; missing security integration tests for cross-user access.

**Phase to address:**
Phase 1 (Foundations and access model).

---

### Pitfall 2: Upload Abandonment from Mobile Friction

**What goes wrong:**
Clients fail to submit videos regularly because upload flow is fragile or slow on mobile networks.

**Why it happens:**
Teams optimize trainer UX first and under-invest in client-side upload resiliency and status feedback.

**How to avoid:**
Prioritize mobile upload UX with clear progress/error states, size guidance, and retry behavior.

**Warning signs:**
High upload-start but low upload-complete rate; frequent support complaints about failed submissions.

**Phase to address:**
Phase 2 (Submission intake workflow).

---

### Pitfall 3: Trainer Review Backlog

**What goes wrong:**
Submissions pile up and trainers stop using the system because review workflow is too slow.

**Why it happens:**
Feedback authoring is not optimized for speed, and there is poor visibility into pending workload.

**How to avoid:**
Design trainer inbox for fast triage; make timestamp comments + summary + voice flow low-friction; track turnaround metrics.

**Warning signs:**
Median response time increases week-over-week; many submissions stay in `ready_for_review`.

**Phase to address:**
Phase 3 (Trainer review and feedback send).

---

### Pitfall 4: Notification Trust Erosion

**What goes wrong:**
Users stop trusting the system because emails are delayed, duplicated, or missing.

**Why it happens:**
No idempotency strategy for send events and weak observability around notification delivery.

**How to avoid:**
Use event IDs, idempotent send logic, and delivery logging for all upload/feedback notifications.

**Warning signs:**
Duplicate notifications reported, or users say they never knew feedback was sent.

**Phase to address:**
Phase 4 (Notification and reliability hardening).

---

### Pitfall 5: Unbounded Media Cost Growth

**What goes wrong:**
Storage/egress costs rise rapidly as video volume grows.

**Why it happens:**
No retention policy, no media constraints, and no monitoring of object size/age.

**How to avoid:**
Set upload limits, retention policy options, and cost monitoring from early releases.

**Warning signs:**
Monthly storage cost climbs faster than active usage growth.

**Phase to address:**
Phase 4-5 (Reliability hardening and analytics readiness).

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single mega-table for all feedback | Fast initial coding | Hard to query, no timestamp semantics | Never (structured feedback is core value) |
| Hardcoding role checks in UI only | Quick UI iteration | Severe security bugs | Never |
| Skipping status state machine | Fewer fields at start | Workflow bugs, missed notifications | Never |
| Manual resend process for emails | No queue infra needed | Operational load and inconsistent UX | Acceptable only for very early pilot with low volume |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Storage | Using public buckets for convenience | Use private buckets + signed URL access |
| Supabase Auth + app roles | Assuming auth role equals app role everywhere | Maintain explicit app role in `profiles` table and check it |
| Email provider | Sending inside blocking request path without retries | Use async send + retry + idempotency keys |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 dashboard queries | Slow trainer dashboard load | Aggregate queries + indexes + batched fetches | Often visible at ~1k+ submissions |
| Recomputing derived counts on every request | Spikes in DB latency | Precompute or cache dashboard counters | Moderate usage growth |
| Large raw media previews without optimization | Slow feedback page loading | Store metadata and optimized playback variants when needed | As average file size increases |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Missing relationship checks on read paths | Unauthorized access to private videos | Central access policy layer + RLS tests |
| Exposing permanent media URLs | External sharing of private data | Signed URLs with short expiry and authenticated generation |
| Weak audit trail for feedback edits | Disputes cannot be resolved | Store actor/timestamps for key feedback actions |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Overly complex upload form | Clients skip submissions | Keep upload flow minimal: video + exercise + optional note |
| Dense trainer review screens | Slower feedback and burnout | Prioritize timeline, key controls, and one-pass feedback entry |
| Branding scattered/inconsistent | Product feels generic | Use consistent branding shell in dashboard, feedback, and emails |

## "Looks Done But Isn't" Checklist

- [ ] **Upload flow:** Often missing retry and clear failure messaging - verify poor-network behavior.
- [ ] **RLS policies:** Often missing update/delete edge checks - verify unauthorized paths fail.
- [ ] **Feedback loop:** Often missing sent-state transitions - verify notification only after send.
- [ ] **Voice notes:** Often missing private access control - verify client sees only their trainer's notes.
- [ ] **Notifications:** Often missing idempotency - verify duplicate event handling.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Data leakage bug | HIGH | Disable affected endpoints, patch policies, rotate links, audit access logs, notify impacted users |
| Upload failure wave | MEDIUM | Add temporary size cap, improve retry UX, monitor error codes, communicate client guidance |
| Review backlog | MEDIUM | Introduce backlog sorting and SLA indicators, simplify review actions, coach onboarding improvements |
| Notification duplication | LOW/MEDIUM | Add dedupe keys, backfill send logs, patch trigger logic and replay safely |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Cross-client data leakage | Phase 1 | Security tests prove unauthorized access is blocked |
| Upload abandonment | Phase 2 | Upload completion rate target achieved in pilot |
| Trainer review backlog | Phase 3 | Median feedback turnaround remains within agreed threshold |
| Notification trust erosion | Phase 4 | Notification delivery metrics and duplicate rate monitored |
| Media cost growth | Phase 4-5 | Storage growth and egress tracked with alert thresholds |

## Sources

- `docs/seed/prd_mvp1.md`
- `docs/seed/system_architecture_evolution.md`
- Supabase RLS and storage documentation
- Common failure patterns from SaaS media workflow implementations

---
*Pitfalls research for: video coaching platform*
*Researched: 2026-03-09*

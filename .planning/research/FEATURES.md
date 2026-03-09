# Feature Research

**Domain:** Video coaching platform for personal trainers
**Researched:** 2026-03-09
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these makes the product feel incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Role-based auth (trainer/client) | Baseline requirement for private coaching data | LOW | Must drive all permission checks and UI paths. |
| Trainer-client linking/invites | Core business relationship model | MEDIUM | Seed schema already models invite/active lifecycle. |
| Mobile-friendly video upload | Most clients record from phones | MEDIUM | Needs progress, retry handling, and upload limits. |
| Trainer video playback + timestamp comments | Core coaching value mechanism | MEDIUM | Must be quick to use to protect trainer turnaround time. |
| Structured feedback packet (summary + comments + optional voice) | Differentiates from unstructured chat | MEDIUM | Voice note included in MVP1 scope. |
| Client feedback view + notifications | Completes the coaching loop | MEDIUM | Email events create behavioral loop continuity. |
| Trainer branding surfaces | Expected for professional coaching workflows | LOW | Dashboard, feedback view, and emails should reflect trainer identity. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Review speed dashboard for trainers | Reinforces your stated MVP priority (fast feedback turnaround) | MEDIUM | Track pending count, age of submissions, median response time. |
| Exercise-specific comment templates/cues | Faster high-quality feedback authoring | MEDIUM | Prebuilt cues by movement reduce writing friction. |
| Voice-note-first review mode | Feels closer to real coaching style than text-only | MEDIUM | Strong UX gain if recording/upload/playback is smooth. |
| Lightweight client progress timeline (pre-AI) | Increases retention without heavy analytics build | MEDIUM | Start with submission cadence + coach response history. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time chat for MVP1 | Feels familiar from messaging apps | Pulls product toward chat replacement instead of structured feedback loop | Keep async notifications + structured review surfaces |
| Fully automated AI coaching in early stages | Perceived immediate innovation | Risks trust, liability, and trainer authority; high infra cost | Route AI insights to trainer first in later MVPs |
| Multi-trainer organizations in MVP1 | Seems useful for future expansion | Explodes permissions, billing, and data model complexity too early | Keep one-trainer-per-client in MVP1 |

## Feature Dependencies

```text
Authentication + Roles
    --> Trainer-Client Relationship
            --> Client Video Submission
                    --> Trainer Review + Timestamp Comments
                            --> Feedback Send + Notification
                                    --> Client Feedback View

Trainer Branding --> Client Dashboard / Feedback Pages / Emails
Voice Notes --> Submission Feedback Object + Media Storage Rules
```

### Dependency Notes

- **Trainer-client relationship requires authentication:** ownership and permissions are impossible without stable identities.
- **Trainer review requires completed submission metadata:** exercise label, client note, and stored video path must exist first.
- **Client feedback view depends on feedback send status:** prevent incomplete draft feedback from leaking to clients.

## MVP Definition

### Launch With (v1)

- [ ] Role-based auth and secure trainer/client access boundaries - essential trust and safety baseline
- [ ] Trainer invites and one-trainer-per-client linking - enables ownership and accountability
- [ ] Mobile-friendly client upload flow with exercise + note - core submission mechanism
- [ ] Trainer review interface with timestamp comments - core coaching behavior
- [ ] Summary feedback + voice note support - required coaching quality and context richness
- [ ] Client feedback experience and notification loop - closes behavior cycle and drives repeat use
- [ ] Trainer branding on key surfaces - required product positioning for coaches

### Add After Validation (v1.x)

- [ ] Trainer turnaround metrics dashboard - add once baseline usage data exists
- [ ] Comment templates by exercise - add when feedback volume reveals common patterns
- [ ] Basic progress timeline (submission and response cadence) - add after workflow consistency is proven

### Future Consideration (v2+)

- [ ] AI instant feedback and rep/technique signals - defer until core loop adoption is confirmed
- [ ] Advanced analytics and trend visualizations - defer until meaningful longitudinal data exists
- [ ] Business tooling (programming, billing, messaging, groups) - defer until PMF signals justify platform expansion

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auth + roles | HIGH | LOW | P1 |
| Trainer-client linking | HIGH | MEDIUM | P1 |
| Video upload flow | HIGH | MEDIUM | P1 |
| Timestamp comments | HIGH | MEDIUM | P1 |
| Summary + voice feedback | HIGH | MEDIUM | P1 |
| Client feedback view | HIGH | MEDIUM | P1 |
| Email notifications | MEDIUM | MEDIUM | P1 |
| Trainer branding | MEDIUM | LOW | P1 |
| Trainer turnaround dashboard | MEDIUM | MEDIUM | P2 |
| Exercise templates | MEDIUM | MEDIUM | P2 |
| AI instant feedback | HIGH | HIGH | P3 |
| Multi-trainer org support | LOW (for MVP1) | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Trainerize | TrueCoach | Our Approach |
|---------|------------|-----------|--------------|
| Messaging + check-ins | Strong | Moderate | Keep structured feedback-first, avoid chat-centric drift in MVP1 |
| Workout programming | Strong | Strong | Explicitly out of scope for MVP1 |
| Video feedback support | Present but not always central | Present | Make timestamped video feedback the primary object and experience |
| Branding | Varies by tier | Limited/moderate | Include branding in MVP1 as a core product promise |

## Sources

- Seed PRD and roadmap documents in `docs/seed/`
- Product architecture seed (`system_architecture_evolution.md`)
- Competitive product positioning from public product pages (Trainerize, TrueCoach)

---
*Feature research for: video coaching platform*
*Researched: 2026-03-09*

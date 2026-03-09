# Requirements: Video Coaching Portal

**Defined:** 2026-03-09
**Core Value:** Trainers can deliver clear, structured video feedback quickly, so the trainer-client coaching loop becomes a repeatable habit.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: Trainer can create an account with email and password.
- [ ] **AUTH-02**: Client can create an account with email and password.
- [ ] **AUTH-03**: User can sign in and stay signed in across browser refresh.
- [ ] **AUTH-04**: User can sign out from any authenticated page.

### Trainer-Client Relationship

- [ ] **RELA-01**: Trainer can invite a client to join their coaching portal.
- [ ] **RELA-02**: Invited client can accept invite and become linked to exactly one trainer.
- [ ] **RELA-03**: Trainer can view their active client list.

### Video Submissions

- [ ] **SUBM-01**: Client can upload a training video file from mobile or desktop browser.
- [ ] **SUBM-02**: Client can select an exercise label when submitting a video.
- [ ] **SUBM-03**: Client can add an optional note to a submission.
- [ ] **SUBM-04**: System stores submission with explicit workflow status (`uploaded`, `ready_for_review`, `feedback_sent`).
- [ ] **SUBM-05**: Client can view their own submission history list.

### Trainer Review and Feedback

- [ ] **REVW-01**: Trainer can view a queue of pending client submissions.
- [ ] **REVW-02**: Trainer can play, pause, and scrub submission video in review page.
- [ ] **REVW-03**: Trainer can add timestamped comments to a submission.
- [ ] **REVW-04**: Trainer can write summary feedback for a submission.
- [ ] **REVW-05**: Trainer can upload one voice note associated with a submission.
- [ ] **REVW-06**: Trainer can send feedback and mark submission as `feedback_sent`.

### Client Feedback Experience

- [ ] **CLFB-01**: Client can open a submission detail page and watch their submitted video.
- [ ] **CLFB-02**: Client can view trainer timestamped comments aligned to video timestamps.
- [ ] **CLFB-03**: Client can read trainer summary feedback text.
- [ ] **CLFB-04**: Client can play trainer voice note for that submission.

### Notifications

- [ ] **NOTF-01**: Trainer receives notification when a client submits a new video.
- [ ] **NOTF-02**: Client receives notification when trainer sends feedback.
- [ ] **NOTF-03**: Notification events are idempotent so duplicate emails are not sent for the same state transition.

### Trainer Branding

- [ ] **BRND-01**: Trainer can set display name and optional business name.
- [ ] **BRND-02**: Trainer can upload logo and headshot assets.
- [ ] **BRND-03**: Client dashboard header shows trainer branding (logo/name/business).
- [ ] **BRND-04**: Feedback pages and notification emails show trainer identity context.

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### AI Assistance

- **AIAS-01**: System performs automatic rep counting after upload.
- **AIAS-02**: System detects preliminary technique flags and exposes them to trainer first.
- **AIAS-03**: Trainer can accept, edit, or discard AI-generated coaching suggestions.

### Progress Analytics

- **ANLY-01**: Trainer can view client progress trends across submissions.
- **ANLY-02**: Client can view personal trend dashboards (frequency and performance signals).

### Business Operations

- **BUSI-01**: Trainer can manage workout programming and plans.
- **BUSI-02**: System supports subscription and billing workflows.
- **BUSI-03**: System supports group or multi-trainer organizational structures.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time chat messaging | MVP1 is intentionally async and structured, not chat-centric |
| Native mobile apps | Web-first launch is sufficient for pilot validation |
| White-label domains | Too much complexity for early pilot |
| Multi-trainer organizations | Single-trainer ownership keeps permissions and workflow clear |
| AI-generated coaching conclusions to clients | Trainer must remain coaching authority |
| Advanced biomechanical analytics | Requires async AI pipeline not needed for MVP1 validation |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | TBD | Pending |
| AUTH-02 | TBD | Pending |
| AUTH-03 | TBD | Pending |
| AUTH-04 | TBD | Pending |
| RELA-01 | TBD | Pending |
| RELA-02 | TBD | Pending |
| RELA-03 | TBD | Pending |
| SUBM-01 | TBD | Pending |
| SUBM-02 | TBD | Pending |
| SUBM-03 | TBD | Pending |
| SUBM-04 | TBD | Pending |
| SUBM-05 | TBD | Pending |
| REVW-01 | TBD | Pending |
| REVW-02 | TBD | Pending |
| REVW-03 | TBD | Pending |
| REVW-04 | TBD | Pending |
| REVW-05 | TBD | Pending |
| REVW-06 | TBD | Pending |
| CLFB-01 | TBD | Pending |
| CLFB-02 | TBD | Pending |
| CLFB-03 | TBD | Pending |
| CLFB-04 | TBD | Pending |
| NOTF-01 | TBD | Pending |
| NOTF-02 | TBD | Pending |
| NOTF-03 | TBD | Pending |
| BRND-01 | TBD | Pending |
| BRND-02 | TBD | Pending |
| BRND-03 | TBD | Pending |
| BRND-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 0
- Unmapped: 29

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 after initial definition*

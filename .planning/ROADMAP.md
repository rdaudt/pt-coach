# Roadmap: Video Coaching Portal

## Overview

This roadmap delivers the full trainer-client video feedback loop in dependency order: secure access and ownership first, then submission and review workflows, then client consumption, and finally reliable branded communication.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Identity and Coaching Relationships** - Trainers and clients can authenticate and form one-to-one coaching links. (completed 2026-03-10)
- [ ] **Phase 2: Client Video Submission Pipeline** - Clients can submit labeled training videos and track submission status/history.
- [ ] **Phase 3: Trainer Review and Feedback Authoring** - Trainers can review submissions and send structured feedback with voice notes.
- [ ] **Phase 4: Client Feedback Experience and Brand Setup** - Clients can consume feedback, and trainers can configure visible brand identity.
- [ ] **Phase 5: Branded Notification Delivery** - Upload/feedback emails are reliable, idempotent, and branded consistently.

## Phase Details

### Phase 1: Identity and Coaching Relationships
**Goal**: Users can securely access accounts and establish trainer-client ownership boundaries required for all later workflows.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, RELA-01, RELA-02, RELA-03
**Success Criteria** (what must be TRUE):
  1. Trainer can create an account, sign in, remain signed in across browser refresh, and sign out from authenticated pages.
  2. Client can create an account, sign in, remain signed in across browser refresh, and sign out from authenticated pages.
  3. Trainer can send an invite and invited client can accept it to become linked to exactly one trainer.
  4. Trainer can view an active client list that includes all linked clients.
**Plans**: TBD

### Phase 2: Client Video Submission Pipeline
**Goal**: Clients can reliably submit coaching videos with required metadata and track their own submission records.
**Depends on**: Phase 1
**Requirements**: SUBM-01, SUBM-02, SUBM-03, SUBM-04, SUBM-05
**Success Criteria** (what must be TRUE):
  1. Client can upload a training video from mobile or desktop browser.
  2. Client must select an exercise label during submission and can add an optional note.
  3. Each submission persists with explicit workflow status values (`uploaded`, `ready_for_review`, `feedback_sent`).
  4. Client can open a history list containing only their own prior submissions.
**Plans**: TBD

### Phase 3: Trainer Review and Feedback Authoring
**Goal**: Trainers can efficiently review incoming submissions and produce complete feedback packages.
**Depends on**: Phase 2
**Requirements**: REVW-01, REVW-02, REVW-03, REVW-04, REVW-05, REVW-06
**Success Criteria** (what must be TRUE):
  1. Trainer can view a queue of pending client submissions ready for review.
  2. Trainer can play, pause, and scrub a submission video and add timestamped comments.
  3. Trainer can add summary feedback text and upload one voice note for the submission.
  4. Trainer can send feedback and the submission status changes to `feedback_sent`.
**Plans**: TBD

### Phase 4: Client Feedback Experience and Brand Setup
**Goal**: Clients can consume all trainer feedback artifacts while trainers configure core branding shown in client surfaces.
**Depends on**: Phase 3
**Requirements**: CLFB-01, CLFB-02, CLFB-03, CLFB-04, BRND-01, BRND-02, BRND-03
**Success Criteria** (what must be TRUE):
  1. Trainer can set display name, optional business name, and upload logo/headshot assets.
  2. Client dashboard header shows trainer branding (logo, name, and business where provided).
  3. Client can open a submission detail page, watch their video, and view aligned timestamp comments plus summary feedback.
  4. Client can play the trainer voice note attached to that submission.
**Plans**: TBD

### Phase 5: Branded Notification Delivery
**Goal**: The coaching loop closes with reliable event notifications and consistent trainer identity context in communication surfaces.
**Depends on**: Phase 4
**Requirements**: NOTF-01, NOTF-02, NOTF-03, BRND-04
**Success Criteria** (what must be TRUE):
  1. Trainer receives a notification when a client submits a new video.
  2. Client receives a notification when trainer sends feedback.
  3. Repeated processing of the same state transition does not send duplicate emails.
  4. Feedback pages and notification emails display trainer identity context consistently.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Identity and Coaching Relationships | 3/3 | Complete    | 2026-03-10 |
| 2. Client Video Submission Pipeline | 0/TBD | Not started | - |
| 3. Trainer Review and Feedback Authoring | 0/TBD | Not started | - |
| 4. Client Feedback Experience and Brand Setup | 0/TBD | Not started | - |
| 5. Branded Notification Delivery | 0/TBD | Not started | - |

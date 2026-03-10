---
phase: 02
slug: client-video-submission-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 02 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- src/features/submissions/*.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~6 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/features/submissions/*.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | SUBM-01 | unit | `npm test -- src/features/submissions/schemas.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | SUBM-02,SUBM-03 | unit | `npm test -- src/features/submissions/schemas.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | SUBM-04 | unit/integration | `npm test -- src/features/submissions/service.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | SUBM-05 | integration | `npm test -- src/features/submissions/queries.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/features/submissions/schemas.test.ts` - validation and label model coverage
- [ ] `src/features/submissions/service.test.ts` - submission create/status transition coverage
- [ ] `src/features/submissions/queries.test.ts` - client-only history scope and pagination coverage
- [ ] `src/features/submissions/selectors.test.ts` - history row/view-state derivation coverage

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile upload progress and retry experience | SUBM-01,SUBM-03 | Requires browser/device UX confirmation | Submit a large file from mobile viewport; verify inline progress, failure messaging, and metadata persistence across retry |
| Long-duration soft warning UX | SUBM-01 | Warning copy and interaction quality is user-facing | Upload a video over threshold; verify warning appears and does not block submit |
| History list readability and status badges | SUBM-05 | Visual hierarchy/state messaging requires UI review | Create multiple submissions and verify newest-first ordering, key row metadata, and load-more behavior |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

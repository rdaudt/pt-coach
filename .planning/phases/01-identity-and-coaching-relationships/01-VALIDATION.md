---
phase: 1
slug: identity-and-coaching-relationships
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 1 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react (Wave 0 installs) |
| **Config file** | `vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `npm run test -- --run tests/auth tests/relationships` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run tests/auth tests/relationships`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | AUTH-01 | integration | `npm run test -- --run tests/auth/trainer-signup.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | AUTH-02 | integration | `npm run test -- --run tests/auth/client-signup.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | AUTH-03 | integration | `npm run test -- --run tests/auth/session-persistence.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | AUTH-04 | integration | `npm run test -- --run tests/auth/signout.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | RELA-01 | integration | `npm run test -- --run tests/relationships/invite-send.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | RELA-02 | integration | `npm run test -- --run tests/relationships/invite-accept.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-03 | 02 | 1 | RELA-03 | integration | `npm run test -- --run tests/relationships/client-list.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/auth/` - auth flow tests for AUTH-01..04
- [ ] `tests/relationships/` - invite/link tests for RELA-01..03
- [ ] `tests/setup/` - shared fixtures and auth/session mocks
- [ ] `vitest`, `@testing-library/react`, `@testing-library/jest-dom` - install and config

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Invite email rendering and delivery in real inbox | RELA-01 | External provider behavior cannot be fully trusted in local automation | Send invite from trainer UI, verify delivered email includes valid link and expiry messaging |
| Cross-role redirect notice copy clarity | AUTH-01..04 / RELA-01..03 | UX wording quality is subjective | Attempt role-mismatched route navigation and confirm redirect + clear notice message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

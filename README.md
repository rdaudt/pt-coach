# PT Coach (Phase 1 Local Runtime)

This repository now has a minimal Next.js runtime so you can manually test Phase 1 flows.

## Prerequisites

- Node.js 20+
- npm

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## What Works in Local Runtime

- Trainer signup/signin/signout
- Client signup/signin/signout
- Trainer invite send/resend from dashboard
- Client invite acceptance flow
- Trainer/client relationship dashboards

## Manual Test Path

1. Go to `/trainer-signup` and create a trainer account.
2. From `/trainer`, send an invite to a client email.
3. Sign out.
4. Open `/client-signup`, paste the invite token shown in trainer pending invites (or from invite URL if using API response).
5. Create client account and complete invite acceptance.
6. Confirm trainer dashboard shows active client and client dashboard shows linked coach.

## Notes

- Local runtime is in-memory (`src/features/dev/local-runtime.ts`).
- Restarting the dev server resets users/invites/relationships.
- Existing unit tests still run with `npm test`.

## E2E UAT Automation (Playwright)

Phase 2 UAT flow is automated in `tests/e2e/phase2-uat.spec.ts`.

### One-time browser install

```bash
npm run test:e2e:install
```

### Run headless (default)

```bash
npm run test:e2e
```

### Run headed (watch browser)

```bash
npm run test:e2e:headed
```

### Interactive Playwright UI mode

```bash
npm run test:e2e:ui
```

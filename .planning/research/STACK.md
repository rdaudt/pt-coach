# Stack Research

**Domain:** Video coaching platform for personal trainers and clients
**Researched:** 2026-03-09
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1.6 | Full-stack web app (UI + server routes/actions) | Fastest path to ship the MVP workflow on Vercel with one codebase and mature patterns for auth-protected dashboards. |
| React | 19.2.4 | Client UI framework | Works natively with Next.js App Router and supports responsive, componentized trainer/client workflows. |
| Supabase (`@supabase/supabase-js`) | 2.99.0 | Auth, Postgres access, storage integration | Matches current seed architecture and supports row-level security and private media storage with minimal backend ops. |
| Supabase Postgres + RLS | Managed | System-of-record data layer | Strong fit for trainer/client data partitioning and submission ownership rules already defined in the seed SQL. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/ssr` | 0.9.0 | Session handling in Next.js server/client contexts | Required for secure auth/session handling across server-rendered and client-rendered views. |
| `react-hook-form` | 7.71.2 | Forms for upload metadata and profile editing | Use for all user input forms where validation and performance matter. |
| `zod` | 4.3.6 | Runtime schema validation | Use for request validation in route handlers/server actions and form schemas. |
| `@tanstack/react-query` | 5.90.21 | Data fetching/cache for dashboards | Use for trainer inbox, submission lists, and optimistic UI updates. |
| `resend` | 6.9.3 | Transactional email API client | Use for upload and feedback notifications and trainer invite flows. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript 5.9.3 | Type safety across app/server boundaries | Enable `strict` mode from day one to reduce role/permission defects. |
| ESLint 10.0.3 | Code quality and consistency | Enforce import rules and security-sensitive lint checks around auth and data access. |
| Playwright 1.58.2 | End-to-end workflow testing | Prioritize E2E tests for upload -> review -> feedback -> client view loop. |

## Installation

```bash
# Core
npm install next@16.1.6 react@19.2.4 react-dom@19.2.4 @supabase/supabase-js@2.99.0 @supabase/ssr@0.9.0

# Supporting
npm install react-hook-form@7.71.2 zod@4.3.6 @tanstack/react-query@5.90.21 resend@6.9.3 date-fns@4.1.0

# Dev dependencies
npm install -D typescript@5.9.3 eslint@10.0.3 playwright@1.58.2
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js + Vercel | Remix | Choose Remix if team preference is route/action conventions and nested routing ergonomics over Next.js ecosystem defaults. |
| Supabase Postgres + RLS | Firebase | Choose Firebase only if realtime-first/offline-first requirements outweigh relational querying and SQL policy control. |
| Supabase Storage | Cloudinary | Add Cloudinary when advanced video transformation/CDN tooling is required beyond private object storage and signed URLs. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Splitting into microservices in MVP1 | Adds deployment and operational complexity before product risk is reduced | Keep one Next.js codebase with clean module boundaries |
| Public media buckets for client videos | High privacy and compliance risk for sensitive training footage | Private buckets + signed URLs + strict RLS checks |
| AI/CV inference dependencies in MVP1 critical path | Increases build time and reliability risk before core loop is validated | Add async AI workers only in later roadmap stages |

## Stack Patterns by Variant

**If pilot remains under ~50 active clients per trainer:**
- Use monolithic Next.js app + Supabase only
- Because operational simplicity beats premature scale optimization

**If uploads start failing due larger volume/file sizes:**
- Add async media processing worker (not full AI yet)
- Because metadata extraction and format normalization should not block user-facing requests

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `next@16.1.6` | `react@19.2.4`, `react-dom@19.2.4` | Keep React/React DOM aligned to avoid runtime and build mismatches. |
| `@supabase/ssr@0.9.0` | `@supabase/supabase-js@2.99.0` | Use matching major versions from Supabase docs/examples. |
| `react-hook-form@7.71.2` | `zod@4.3.6` | Use zod resolver integration for shared UI/API validation schemas. |

## Sources

- https://www.npmjs.com/package/next - latest stable package version
- https://www.npmjs.com/package/react - latest stable package version
- https://www.npmjs.com/package/@supabase/supabase-js - latest stable package version
- https://www.npmjs.com/package/@supabase/ssr - latest stable package version
- https://supabase.com/docs - auth, RLS, and storage patterns
- https://nextjs.org/docs - deployment and app architecture guidance

---
*Stack research for: video coaching platform*
*Researched: 2026-03-09*

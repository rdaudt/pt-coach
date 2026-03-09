# Video Coaching Portal

## What This Is

Video Coaching Portal is a support tool for personal trainers and their clients to run a structured video feedback workflow. Clients upload training videos with exercise labels and notes, and trainers review them with timestamp comments, summary feedback, and voice notes. The MVP is focused on proving adoption and coaching value in a small pilot, not on scale or advanced intelligence.

## Core Value

Trainers can deliver clear, structured video feedback quickly, so the trainer-client coaching loop becomes a repeatable habit.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] Trainer and client authentication with role-based access
- [ ] Trainer invites clients and manages trainer-client relationships
- [ ] Client uploads a video submission with exercise label and optional note
- [ ] Trainer reviews video with playback controls and timestamp comments
- [ ] Trainer sends summary feedback and optional voice note
- [ ] Client views video, timestamp feedback, summary, and voice note
- [ ] Email notifications for upload and feedback events
- [ ] Trainer branding appears in client dashboard, feedback views, and emails

### Out of Scope

- AI analysis - deferred to later MVPs to protect trainer-centered coaching workflow
- Real-time streaming and chat messaging - async feedback loop is the MVP focus
- Workout programming and billing/subscriptions - business tooling is planned for later stages
- Multi-trainer organizations and white-label domains - unnecessary complexity for initial pilot
- Native mobile apps and social sharing - web-first validation path
- Advanced analytics - MVP measures basic adoption and turnaround first

## Context

- Seed documents define a staged roadmap from MVP1 through AI assistance, analytics, and business tools.
- MVP1 stack direction: Next.js on Vercel with Supabase Auth, Postgres, Storage, and email provider integration.
- Data model and RLS policies are already drafted for trainer/client roles, submissions, feedback, voice notes, and private media buckets.
- Product philosophy is trainer-first, video-first, and gradual intelligence where AI assists trainers instead of replacing them.
- Pilot context is small-scale: approximately two trainers and a limited client cohort.

## Constraints

- **Deployment**: Vercel-hosted web app - fast delivery and low ops overhead for pilot
- **Backend**: Supabase (Auth, Postgres, Storage) - keeps MVP architecture simple and managed
- **Scope**: MVP1 only validates core coaching workflow - avoid platform expansion before adoption signal
- **Pilot Size**: Small initial cohort (about 2 trainers) - optimize for reliability and speed over scale
- **Workflow Authority**: Trainer remains final voice in coaching feedback - AI and automation cannot bypass trainer judgment

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Prioritize trainer review speed in MVP1 | Faster turnaround drives repeat coaching loops and trainer adoption | - Pending |
| Include voice notes in MVP1 | Voice feedback is part of the desired coaching quality and workflow validation | - Pending |
| Use single-trainer-per-client relationship in MVP1 | Simplifies access control and ownership during pilot | - Pending |
| Keep MVP1 non-AI | De-risks build and validates core behavior before heavier async AI infrastructure | - Pending |

---
*Last updated: 2026-03-09 after initialization*

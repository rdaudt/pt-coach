# System Architecture Evolution
## Video Coaching Platform for Personal Trainers

---

# 1. Purpose

This document describes how the system architecture should evolve from the current **MVP1** into a more capable platform that supports:

- video-first coaching
- trainer branding
- asynchronous AI-assisted analysis
- client progress tracking
- increased operational reliability

The goal is not to optimize prematurely, but to make sure early technical decisions do not block future product development.

---

# 2. Architecture Strategy

The architecture should evolve according to four principles:

## 2.1 Start simple
MVP1 should use as few moving parts as possible.

This means:
- one application codebase
- managed database and storage
- minimal infrastructure
- no separate AI pipeline yet

---

## 2.2 Keep clear boundaries
Even in MVP1, responsibilities should be separated conceptually:

- product UI
- business logic
- persistence
- media storage
- asynchronous jobs
- AI analysis

These boundaries allow future extraction without a rewrite.

---

## 2.3 Add services only when justified
New infrastructure should appear only when there is a clear product or engineering need.

Examples:
- do not add queues before there are async jobs
- do not add microservices before there are clear service boundaries
- do not build inference pipelines before AI is actually shipped

---

## 2.4 Preserve trainer-centered workflow
As the architecture evolves, it must continue to support the product principle:

**AI assists the trainer; it does not replace the trainer.**

This affects:
- data flow
- permissions
- reporting
- client-facing outputs

---

# 3. Stage 1 — MVP1 Architecture

## 3.1 Objective

Support the basic coaching workflow:

Client uploads video  
→ Trainer reviews  
→ Trainer sends structured feedback  
→ Client views feedback

---

## 3.2 Stack

- **Frontend / App server:** Next.js on Vercel
- **Auth:** Supabase Auth
- **Database:** Supabase Postgres
- **Storage:** Supabase Storage
- **Email:** Resend or Postmark

---

## 3.3 Logical Components

### Web application
Single Next.js codebase with:
- trainer UI
- client UI
- server actions / route handlers
- authentication integration
- permission checks

### Database
Stores:
- users
- trainer profiles
- trainer-client relationships
- exercises
- video submission metadata
- comments
- summary feedback
- voice feedback metadata

### Storage
Stores:
- uploaded videos
- trainer logos
- trainer headshots
- trainer voice notes

### Email integration
Used for:
- upload notifications
- feedback notifications
- invites

---

## 3.4 Data Flow

### Client submission flow
1. client authenticates
2. client uploads video to storage
3. app creates video submission record
4. trainer is notified

### Trainer feedback flow
1. trainer opens submission
2. trainer watches video
3. trainer adds comments and summary
4. trainer optionally uploads voice note
5. app marks feedback as sent
6. client is notified

---

## 3.5 Strengths of Stage 1
- very low infrastructure overhead
- fast to build
- low maintenance burden
- ideal for product validation

---

## 3.6 Limitations of Stage 1
- no asynchronous job orchestration
- no media processing pipeline
- no AI support
- limited observability
- limited analytics

These limitations are acceptable for MVP1.

---

# 4. Stage 2 — Hardening the MVP1 Foundation

## 4.1 Objective

Make the system more reliable and operationally clean without significantly changing the product.

This stage is appropriate once:
- pilot usage is real
- PTs are actively using the platform
- uploads and feedback volume is increasing modestly

---

## 4.2 New Concerns Introduced

At this point, practical issues become more important:

- upload failures
- inconsistent media playback
- larger video files
- visibility into errors
- supportability

---

## 4.3 Recommended Additions

### Video validation layer
Validate on upload:
- supported file type
- file size
- duration limits

This can still live inside the main app.

---

### Lightweight media processing
Add a background processing path for:
- extracting video metadata
- normalizing playback format if needed
- generating thumbnails

This does not need a full AI pipeline yet.

A practical implementation can be:
- storage upload trigger
- serverless background function
- or a small worker

---

### Observability
Add:
- centralized logs
- error tracking
- upload/failure metrics

Useful tools:
- Sentry
- Vercel logs
- Supabase logs

---

### Basic analytics
Track:
- upload completion rate
- review turnaround time
- feedback sent rate
- repeat submissions per client

This can initially be stored in Postgres and surfaced in simple internal views.

---

## 4.4 Architectural Impact

At this stage, the architecture remains mostly monolithic:

- Next.js remains the core application
- Supabase remains the system of record
- a small async processing capability is introduced

This stage prepares the system for AI without yet introducing AI complexity.

---

# 5. Stage 3 — MVP2 AI Instant Feedback

## 5.1 Objective

Introduce lightweight automated analysis that gives immediate value after upload.

Example outputs:
- rep count
- simple exercise-specific flags
- preliminary observations

These are presented as **preliminary**, not final coaching conclusions.

---

## 5.2 Why the Architecture Must Change

AI introduces new requirements:
- asynchronous processing
- heavier compute
- model dependencies
- potentially longer-running jobs
- artifact storage
- failure handling and retries

This should not be handled inside the main Next.js application.

---

## 5.3 New Components

### Job orchestration
Introduce a job queue.

Responsibilities:
- enqueue analysis after upload
- manage retry behavior
- track job state

Possible options:
- Redis + BullMQ
- Supabase queue alternatives
- managed job systems

For early AI, simplicity matters more than perfect scale.

---

### AI worker service
Create a separate Python-based service responsible for:
- downloading videos
- running CV models
- computing metrics
- writing analysis results back to the database

This service should be isolated from the main app because:
- ML dependencies are heavy
- compute time is variable
- deployment cadence differs from product UI

---

### Analysis results storage
Add database tables for:
- analysis jobs
- per-submission results
- rep segments
- technique flags
- model confidence
- processing state

Optionally store generated artifacts:
- path overlays
- key frame screenshots
- derived JSON blobs

---

## 5.4 Data Flow

1. client uploads video
2. submission record created
3. analysis job queued
4. AI worker processes video
5. results stored in DB
6. client receives lightweight instant feedback
7. trainer sees deeper AI insights in review interface

---

## 5.5 Important Product Constraint

Client-facing AI output must remain limited.

The architecture should support separate output layers:

- **client layer:** lightweight, preliminary observations
- **trainer layer:** richer technical analysis

This distinction should be reflected in schema and API design.

---

# 6. Stage 4 — Trainer AI Assistant

## 6.1 Objective

Use AI to reduce trainer review time rather than merely adding automation.

At this stage, the system generates:
- draft notes
- suggested timestamps
- suggested coaching cues
- rep-by-rep observations

The trainer can accept, edit, or discard these suggestions.

---

## 6.2 Architectural Additions

### Suggestion pipeline
Separate raw analysis from generated coaching suggestions.

This means:
- CV layer computes metrics
- interpretation layer turns metrics into suggestions
- trainer UI presents editable suggestions

This separation is important because:
- metrics are reusable
- rules can evolve without rerunning vision inference
- trainer-facing language can improve independently

---

### Rule engine / interpretation layer
Introduce a service or module that maps metrics into observations.

Examples:
- “Rep 3 shows moderate forward bar drift”
- “Depth consistency dropped in final reps”

This can begin as rule-based logic before introducing LLM-assisted summarization.

---

### Suggestion auditability
Store:
- generated suggestion
- trainer edits
- accepted / rejected state

This is useful for:
- measuring trust
- improving suggestion quality
- future model tuning

---

# 7. Stage 5 — Progress Tracking and Analytics

## 7.1 Objective

Turn isolated video reviews into longitudinal coaching intelligence.

Examples:
- trend lines across submissions
- depth consistency over time
- bar path efficiency improvement
- review cadence
- client compliance patterns

---

## 7.2 Architectural Requirements

### Time-series friendly metric storage
Instead of storing only raw reports, store normalized metrics that can be trended.

Examples:
- one row per submission metric
- one row per rep metric
- timestamps and dimensions for filtering

This enables charts and dashboards later.

---

### Aggregation layer
Add background jobs or materialized views that compute:
- per-client trends
- per-exercise summaries
- trainer dashboard metrics

These can be updated:
- on analysis completion
- on a schedule
- via materialized refresh

---

### Reporting API
Expose progress data through dedicated endpoints rather than reconstructing it from raw submissions on every page load.

This becomes increasingly important as history grows.

---

# 8. Stage 6 — Advanced Video Analysis

## 8.1 Objective

Provide deeper exercise intelligence for trainer use.

Potential examples:
- bar path overlay
- rep phase timing
- concentric/eccentric timing
- velocity estimation
- fatigue indicators
- technique scoring

---

## 8.2 Architectural Requirements

### Artifact generation pipeline
Store derived visual outputs such as:
- trajectory overlays
- key frame captures
- downloadable report assets

This may require:
- render workers
- artifact lifecycle management
- CDN-friendly delivery

---

### Versioned analysis
As models improve, the same video may need re-analysis.

Introduce versioning for:
- model version
- rules version
- suggestion version

This allows:
- reproducibility
- comparison across model releases
- safe iteration

---

### Reprocessing workflow
Add the ability to:
- re-run old submissions with new models
- backfill metrics
- regenerate summaries

This should be asynchronous and track job history.

---

# 9. Stage 7 — Business Platform Expansion

## 9.1 Objective

Support broader trainer operations after the coaching workflow is well established.

Possible features:
- workout programming
- training plans
- client check-ins
- subscriptions
- group coaching
- retention workflows

---

## 9.2 Architectural Impact

At this point, the platform evolves from a pure video tool into a broader coaching platform.

New concerns:
- richer domain models
- more notifications and automation
- billing integration
- potentially more complex access control

This is the point where architectural modularization becomes more important.

---

## 9.3 Modular Domain Boundaries

Likely domains:
- identity and access
- trainer branding
- client management
- submissions and media
- feedback
- AI analysis
- progress analytics
- business operations

These may still live in one repository, but should be clearly separated in code and APIs.

---

# 10. Cross-Cutting Concerns Through All Stages

## 10.1 Security and privacy
Because the product handles private videos, maintain strict controls throughout:

- private storage buckets
- signed access URLs
- row-level security
- role-aware queries
- careful audit of trainer-client access

---

## 10.2 Observability
As architecture evolves, visibility becomes more important.

Recommended progression:

### MVP1
- basic logs
- manual debugging

### AI-enabled stages
- structured logs
- job monitoring
- processing success/failure metrics
- alerting for failed analysis jobs

---

## 10.3 Data quality
As the system introduces AI and analytics, schema discipline matters more.

Prefer:
- normalized core data
- explicit statuses
- versioned analysis results
- audit trails for trainer edits

---

## 10.4 Cost control
The architecture should evolve in a cost-aware manner.

Most expensive future areas:
- video storage
- video egress
- media processing
- AI inference compute

Design choices should allow:
- retention policies
- re-encoding policies
- bounded analysis scope
- selective reprocessing

---

# 11. Recommended Evolution Path

The recommended sequence is:

## Step 1
Ship MVP1 using:
- Next.js
- Supabase
- Vercel

Validate:
- uploads
- trainer review workflow
- feedback quality
- branding impact

---

## Step 2
Add reliability improvements:
- validation
- metadata extraction
- thumbnails
- observability

---

## Step 3
Introduce async job architecture and AI workers.

Only after confirming:
- trainers and clients use the product consistently
- enough videos exist to justify automated analysis

---

## Step 4
Add trainer-facing AI assistance.

Focus on:
- reducing review time
- improving trainer experience
- maintaining trainer authority

---

## Step 5
Add progress analytics and advanced visual outputs.

---

## Step 6
Expand into broader trainer business operations if product-market pull exists.

---

# 12. Architectural Guardrails for MVP1

To avoid blocking future evolution, MVP1 should follow these guardrails:

## Keep media metadata in the database
Do not treat storage as the source of truth.

---

## Use explicit status fields
Examples:
- uploaded
- ready_for_review
- feedback_sent

This makes async evolution easier later.

---

## Keep feedback objects structured
Store:
- summary feedback
- timestamp comments
- voice notes

Do not collapse everything into one blob.

---

## Separate trainer profile data from auth data
Branding and business identity should remain distinct from authentication records.

---

## Keep AI out of the critical path for now
Future AI should plug into the system, not reshape the core workflow.

---

# 13. Final Architectural End State

At maturity, the system will likely consist of:

### Product application
Trainer and client interfaces, authentication, business workflows.

### Core database
Users, relationships, submissions, feedback, branding, metrics.

### Media storage layer
Private storage for videos, images, audio, and generated artifacts.

### Async processing layer
Jobs for media handling, notifications, analytics, and AI orchestration.

### AI worker layer
Video analysis, feature extraction, and model execution.

### Interpretation layer
Rules and suggestion generation for trainer-facing AI assistance.

### Analytics layer
Progress tracking, aggregates, trends, and trainer dashboards.

This end state supports a product that remains **trainer-centered, video-first, and incrementally intelligent**.

---

# 14. Conclusion

The architecture should evolve gradually alongside product validation.

The correct approach is not to build the final architecture now, but to:

- start with a lean and reliable MVP1
- preserve clean boundaries
- introduce async processing only when needed
- add AI in a trainer-supportive way
- expand into analytics and business tooling only after the core coaching loop is proven

This path minimizes waste while keeping the platform ready for meaningful growth.

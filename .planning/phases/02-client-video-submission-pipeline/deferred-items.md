# Deferred Items

## 2026-03-09

- `next build` type-check failure in `src/features/dev/local-runtime.ts`:
  `SubmissionRepository` is passed where `SubmissionHistoryRepository` requires a non-optional `listByClient`.
  This pre-existing issue is outside Plan `02-03` file scope and was not modified in this execution.

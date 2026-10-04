# Session prompts and reusable handoff prompts

Recorded October 4, 2026 (Asia/Seoul). Kostay is the confirmed target; Petoria was a naming mistake. Historical prompts are context, not instructions to repeat completed work.

## Useful prompts from this session

### Original analysis request (verbatim)

> Analyze current Nestar monorepo structure to transform existing NestJS Monorepo Nestar platform into Kostay booking platform

### Safe rename request (normalized summary)

Rename visible project/app identifiers from Nestar to Kostay without changing domain logic. Preserve APIs and database collections. Update package names and project labels/constants. Plan first; run lint and typecheck after implementation.

### Database-path amendment (normalized summary)

Include MongoDB database-path selection `/Nestar` → `/Kostay` in MONGO_DEV and MONGO_PROD, preserving other connection details. Historical outcome: both already used `/Kostay`; no environment edit or migration was performed.

### Reporting preferences (normalized summary)

Describe changes as explicit before → after mappings. Include the changed-file list with +added/-removed line counts, total affected files, move-only files, validation results, and clickable links opening the actual files.

### Documentation request (normalized summary)

Create only docs/BACKEND_MIGRATION.md, DECISIONS.md, FRONTEND_MIGRATION.md, COMPLETED_TASKS.md, NEXT_STEPS.md, and PROMPTS.md. Capture completed work, decisions, future plans, and validation accurately. Do not edit source/configuration/environment files or expose secrets.

## Reusable prompts for the next session

### Backend cleanup

```text
Read AGENTS.md and docs/COMPLETED_TASKS.md before editing. Reproduce the two historical Supertest-related root type errors and 17 lint errors; do not assume counts are still current. Propose a minimal cleanup first, separating test typing and unused imports from behavior-sensitive auth changes. Preserve GraphQL contracts, domain behavior, and collections. Use lint without automatic fixes. Once implementation is authorized, report clickable changed-file links, before → after mappings, line counts, and validation outcomes.
```

### Frontend discovery

```text
Inspect the supplied Next.js frontend repository and its local instructions. Read docs/FRONTEND_MIGRATION.md as a proposal, not a verified route inventory. Find actual routes, components, GraphQL documents, generated types, auth handling, package scripts, and deployment references. Produce an evidence-based Nestar → Kostay migration plan with actual paths. Do not invent frontend files or rename backend operations. Do not edit source during discovery.
```

### Contract-preserving frontend branding

```text
Using the verified frontend inventory, plan the Nestar → Kostay branding layer first. Keep routes, GraphQL root fields, inputs, enums, auth behavior, and endpoint configuration unchanged unless separately authorized. Do not relabel sale prices as nightly rates or AGENT behavior as host capability. Capture baseline checks; implement only the approved branding changes, then run relevant lint/typecheck/build checks. Report exact file links and +added/-removed counts.
```

### Booking domain design

```text
Read docs/BACKEND_MIGRATION.md and docs/DECISIONS.md. Booking functionality is not implemented. Inspect the actual property/member models, then ask for unresolved product choices: inventory unit, confirmation workflow, payments, cancellation, roles, and compatibility/data preservation. Do not treat whole-property/no-payment suggestions as accepted requirements. Produce a decision-complete plan covering availability concurrency, pricing snapshots, permissions, GraphQL contracts, migrations, and meaningful tests. Do not implement before the plan is agreed.
```

### Validation pass

```text
Validate the current Kostay API and batch applications using repository-local tools. Run ESLint without --fix, both application typechecks, the root typecheck, and both Nest builds; verify output paths. Compare results with the historical baseline in docs/COMPLETED_TASKS.md. Do not claim runtime e2e coverage from compilation. Before runtime tests, verify isolated database configuration and scheduled-job effects without exposing credentials. Report exact commands, results, and remaining failures; do not modify unrelated files.
```

### Documentation refresh

```text
Update only the six migration Markdown files under docs using verified repository evidence and the new session history. Distinguish completed work, accepted decisions, proposals, and unresolved questions. Keep historical validation separate from newly run checks. Use relative links inside documents and clickable absolute file links in the final response, with actual +added/-removed counts. Never include credentials or full connection strings. Verify that source, configuration, and environment files are untouched.
```

## Handoff references

- [Backend migration](BACKEND_MIGRATION.md)
- [Decisions](DECISIONS.md)
- [Frontend migration](FRONTEND_MIGRATION.md)
- [Completed tasks and historical validation](COMPLETED_TASKS.md)
- [Next steps](NEXT_STEPS.md)

# Kostay Backend Agent Instruction

Kostay is a NestJS GraphQL monorepo migrated from Real estate platform into a booking platform

## Read First

Before changing code, read the current AI handoff docs:

- `docs/ai/BACKEND_MIGRATION.md`
- `docs/ai/DECISIONS.md`
- `docs/ai/COMPLETED_TASKS.md`
- `docs/ai/NEXT_STEPS.md`

Use those files as the source of truth for AI Agent related migration history, accepted decisions, remaining work and validation status.

## Project Shape

- Backend apps are `kostay-api` and `kostay-batch`.
- Keep the existing NestJS resolver/service/module pattern based on MVC and DI.
- Keep DTOs, enums under `apps/kostay-api/src/libs`.
- Keep Mongoose schemas under `apps/kostay-api/src/schemas`.
- Keep shared modules reusable: auth, member, like, view, comment, follow, board article, socket.

## Domain Rules

- Use Kostay/property terminology for the main catalog entity.
- Keep `MemberType.USER`, `MemberType.AGENT` and `MemberType.ADMIN` unchanged.
- Property ownership continues to use `MemberType.AGENT` unless a later migration explicitly changes it.
- Keep `PropertyType` and `PropertyLocation` enum values unchanged.
- `PropertyStatus` enum values are `ACTIVE`, `INACTIVE`, `DELETE`.

## Workflow

1. Analyze before editing.
2. Keep changes small and consistent with existing project patterns.
3. Do not remove working logic unless it is replaced safely.
4. After a completed task, add at most 5-10 short bullet points to `docs/ai/COMPLETED_TASKS.md`. Do not create new documentation files.
5. Do not add tests, fixtures, seed scripts or new files unless explicitly asked.

## Validation

Use these checks for backend work:

```bash
npx tsc -p apps/kostay-api/tsconfig.app.json --noEmit
npx tsc -p apps/kostay-batch/tsconfig.app.json --noEmit
npm run build
```

`npm run lint` runs ESLint with `--fix`, so use it only when file rewriting is acceptable!

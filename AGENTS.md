# Kostay Backend Agent Instruction

Kostay is a NestJS GraphQL monorepo migrated from a real estate platform into a booking platform.

## Project Shape

- Backend apps are `kostay-api` and `kostay-batch`.
- Keep the existing NestJS resolver/service/module pattern with dependency injection.
- Keep DTOs and enums under `apps/kostay-api/src/libs`.
- Keep Mongoose schemas under `apps/kostay-api/src/schemas`.
- Keep PostgreSQL work scoped to `apps/kostay-api/src/database/postgres` (`postgres.module.ts`, `data-source.ts`, `entities/`, `migrations/`) and `apps/kostay-api/src/components/booking`.
- `DatabaseModule` only aggregates `MongoModule` and `PostgresModule`.
- Keep shared modules reusable: auth, member, like, view, comment, follow, board article, socket.

## Domain Rules

- Use Kostay/property terminology for the main catalog entity.
- Keep `MemberType.USER`, `MemberType.AGENT` and `MemberType.ADMIN` unchanged.
- Property ownership continues to use `MemberType.AGENT` unless a later migration explicitly changes it.
- Keep `PropertyType` and `PropertyLocation` enum values unchanged.
- `PropertyStatus` enum values are `ACTIVE`, `INACTIVE`, `DELETE`. `INACTIVE` means the host paused the listing; it never means rented.
- Bookings and payments live in PostgreSQL; members and properties stay in MongoDB.
- Mongo ids are stored in PostgreSQL as `varchar(24)` without foreign keys. Do not add cross-database joins or transactions.
- A booking never changes `propertyStatus`. Only PENDING and CONFIRMED bookings block dates; the check-out day is free.
- Booking status and payment status are separate. Money amounts are always calculated on the server.
- Dates are plain `YYYY-MM-DD` strings.

## Workflow

1. Analyze before editing.
2. Keep changes small and consistent with existing project patterns.
3. Do not remove working logic unless it is replaced safely.
4. Do not add tests, fixtures, seed scripts or new files unless explicitly asked.
5. Schema changes to PostgreSQL go through migrations (`synchronize` stays `false`). Generate a migration, show it, and do not run `migration:run` or touch any `.env` value without being asked.
6. Never print or copy connection strings, passwords or tokens into code, docs or chat.
7. After reading all AGENTS.md, give summary about last situation of project with steps.

## Validation

Use these checks for backend work:

```bash
npx tsc -p apps/kostay-api/tsconfig.app.json --noEmit
npx tsc -p apps/kostay-batch/tsconfig.app.json --noEmit
npm run build
```

`npm run lint` runs ESLint with `--fix`, so use it only when file rewriting is acceptable.

# Backend migration: Nestar → Kostay

## Original and intended projects

| Area        | Original Nestar                                                 | Current Kostay / intended destination                                                                                  |
| ----------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Product     | Real estate listing platform                                    | Booking platform: nightly pricing, host-approved bookings, simulated payments                                          |
| API         | NestJS 10, Apollo, code-first GraphQL                           | Same stack                                                                                                             |
| Persistence | MongoDB, Mongoose 8                                             | MongoDB for content (members, properties, articles, ...) plus PostgreSQL (Neon, TypeORM) for `bookings` and `payments` |
| Accounts    | JWT, bcrypt; USER, AGENT, ADMIN                                 | Same roles; guest = any member, host = the AGENT who owns the property                                                 |
| Listings    | Sale-oriented properties, price, rooms, beds, rent/barter flags | `pricePerNight`, required `maxGuests`; whole-property bookings; rent/barter flags and `SOLD` removed                   |
| Jobs        | Property and agent ranking                                      | Same scheduled jobs; booking jobs (mark COMPLETED, cancel stale PENDING) are not implemented                           |

The goal is accommodation discovery and reservations. Phase 1 changed the property model in MongoDB. Phase 2 added PostgreSQL, booking and payment tables, booking logic and simulated payments. Date-based availability search, a booked-dates query, booking batch jobs, BOOKING notifications and a real payment gateway are still open (see [next steps](NEXT_STEPS.md)).

## Completed naming changes

| Before                                            | After                                             |
| ------------------------------------------------- | ------------------------------------------------- |
| `apps/nestar-api`                                 | `apps/kostay-api`                                 |
| `apps/nestar-batch`                               | `apps/kostay-batch`                               |
| Nest project `nestar-api` / `nestar-batch`        | `kostay-api` / `kostay-batch`                     |
| Root package `nestar`                             | `kostay` in package.json and package-lock.json    |
| `dist/apps/nestar-api` / `dist/apps/nestar-batch` | `dist/apps/kostay-api` / `dist/apps/kostay-batch` |
| Batch imports from `../../nestar-api/src/...`     | `../../kostay-api/src/...`                        |
| `Welcome to Nestar Rest API Server!`              | `Welcome to Kostay Rest API Server!`              |
| `Welcome to Nestar BATCH Server!`                 | `Welcome to Kostay BATCH Server!`                 |

Nest source/configuration paths, npm script targets, and existing greeting tests were updated. See [completed file changes](COMPLETED_TASKS.md).

## Modules and architecture

The [API component module](../apps/kostay-api/src/components/components.module.ts) composes member, auth, property, board-article, comment, like, view, follow and booking modules. AuthGuard and RolesGuard moved with their directory; their contents and behavior were not changed.

`database/` holds `DatabaseModule`, which only aggregates `MongoModule` (`database/mongo`) and `PostgresModule` (`database/postgres`). PostgreSQL files live together under `database/postgres`: `postgres.module.ts`, `data-source.ts` (TypeORM CLI), `entities/` and `migrations/`. DTOs and enums stay in `src/libs`, Mongo schemas in `src/schemas`.

`BookingModule` registers the `Booking` and `Payment` entities (`TypeOrmModule.forFeature`) and the Mongo `Property` model. `BookingService` reads properties from MongoDB and bookings from PostgreSQL; there are no foreign keys or transactions across the two databases. PostgreSQL transactions are used for payment and for cancel-with-refund. A `Payment` has its own table but no separate module yet.

The [batch module](../apps/kostay-batch/src/batch.module.ts) still imports API-owned schemas directly. No top-level shared library was introduced; extracting one is a proposal, not an accepted task.

The WebSocket gateway remains a global broadcast implementation with a short in-memory message history. Private persistent guest–host messaging is not implemented. Notification and notice schemas exist; `NotificationType.BOOKING` has no workflow yet.

## GraphQL changes

No operations were renamed. The property contract changed in Phase 1 (`pricePerNight`, `maxGuests`, `guestsCount` filter, `SOLD` removed); see [FRONTEND_MIGRATION.md](FRONTEND_MIGRATION.md).

Phase 2 added six operations: `createBooking`, `getMyBookings`, `getHostBookings`, `confirmBooking`, `cancelBooking`, `createPayment`. Their arguments, returns and rules are in the booking contract in [FRONTEND_MIGRATION.md](FRONTEND_MIGRATION.md). Date-based availability search and a booked-dates query do not exist yet.

## MongoDB schemas and collections

The [schemas directory](../apps/kostay-api/src/schemas) declares `members`, `properties`, `boardArticles`, `comments`, `likes`, `views`, `follows`, `notifications`, and `notices`.

Phase 1 changed only `properties`: `propertyPrice` → `pricePerNight`, required `maxGuests`, optional `constructedAt`, server-set `deletedAt`; `propertyRent`, `propertyBarter` and `soldAt` removed; `PropertyStatus` is ACTIVE / INACTIVE / DELETE; non-unique indexes declared (an index that already exists in the database is not dropped automatically). `memberProperties` counts ACTIVE + INACTIVE properties. No data migration script was added.

The user approved a URI database-path change `/Nestar` → `/Kostay` for MONGO_DEV and MONGO_PROD. At implementation time both paths already used `/Kostay`, so no environment edit was needed. Changing a URI selects a database; it does not migrate data. Credentials and full URIs are intentionally omitted.

## PostgreSQL (Phase 2)

- Provider: Neon; `bookings` and `payments` only. TypeORM with `synchronize: false`; the schema changes only through migrations.
- Column names are snake_case, TypeScript fields camelCase. `bookings.property_id` and `bookings.member_id` store Mongo `_id` values as `varchar(24)` (no foreign key). `payments.booking_id` is a real foreign key (`ON DELETE RESTRICT`).
- `bookings` has CHECK constraints (`check_out > check_in`, `guests_count > 0`) and the `idx_availability` index on (`property_id`, `check_in`, `check_out`).
- Migration scripts: `npm run migration:generate -- <path>`, `npm run migration:run`, `npm run migration:revert`. Initial migration: `CreateBookingsAndPayments`.
- Booking rules: dates are `YYYY-MM-DD`; only PENDING and CONFIRMED bookings block dates; the check-out day is free; the host cannot book their own property; `guests_count` must not exceed `maxGuests`; the price is calculated on the server; a booking never changes `propertyStatus`.
- Payments are simulated (saved as SUCCEEDED, no gateway). Cancelling a paid booking marks the payment REFUNDED in the same transaction.

## Compatibility notes

- HTTP routes, WebSocket interfaces, authentication, and the non-property, non-booking GraphQL operations are unchanged.
- Environment keys: PORT_API, PORT_BATCH, MONGO_DEV, MONGO_PROD, SECRET_TOKEN, NODE_ENV, and POSTGRES_DEV (POSTGRES_PROD for production is not set up yet). Run the migrations against the target database before deploying.
- Deployment scripts outside this repository may still reference old app or output paths; inspect them before deployment. No external deployment was performed.
- Clients must adopt the Phase 1 property contract and regenerate GraphQL types; booking screens use the new operations.
- Application builds/typechecks passed historically; lint and root test typechecks have known failures. See [validation evidence](COMPLETED_TASKS.md#validation-status). Booking and payment behavior was verified manually with Postman, not with automated tests.

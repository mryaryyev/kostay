# Backend migration: Nestar → Kostay

## Original and intended projects

| Area | Original Nestar | Current Kostay / intended destination |
|---|---|---|
| Product | Real estate listing platform | Booking platform is the goal; real estate business logic remains |
| API | NestJS 10, Apollo, code-first GraphQL | Same stack and contracts |
| Persistence | MongoDB, Mongoose 8 | Same schemas and collections |
| Accounts | JWT, bcrypt; USER, AGENT, ADMIN | Same roles; guest/host capabilities are future work |
| Listings | Sale-oriented properties, price, rooms, beds, rent/barter flags | Unchanged; nightly pricing and bookable inventory are not implemented |
| Jobs | Property and agent ranking | Same scheduled jobs |

The goal is eventually to support accommodation discovery and reservations. Inventory, confirmation workflow, payments, cancellation rules, and compatibility requirements for that future phase remain unresolved. No booking, availability, payment, or booking-verified review module was added.

## Completed naming changes

| Before | After |
|---|---|
| `apps/nestar-api` | `apps/kostay-api` |
| `apps/nestar-batch` | `apps/kostay-batch` |
| Nest project `nestar-api` / `nestar-batch` | `kostay-api` / `kostay-batch` |
| Root package `nestar` | `kostay` in package.json and package-lock.json |
| `dist/apps/nestar-api` / `dist/apps/nestar-batch` | `dist/apps/kostay-api` / `dist/apps/kostay-batch` |
| Batch imports from `../../nestar-api/src/...` | `../../kostay-api/src/...` |
| `Welcome to Nestar Rest API Server!` | `Welcome to Kostay Rest API Server!` |
| `Welcome to Nestar BATCH Server!` | `Welcome to Kostay BATCH Server!` |

Nest source/configuration paths, npm script targets, and existing greeting tests were updated. Dependency versions were preserved. See [completed file changes](COMPLETED_TASKS.md).

## Modules and architecture

The [API component module](../apps/kostay-api/src/components/components.module.ts) still composes member, auth, property, board-article, comment, like, view, and follow modules. The API also includes database and WebSocket modules. AuthGuard and RolesGuard moved with their directory; their contents and behavior were not changed.

The [batch module](../apps/kostay-batch/src/batch.module.ts) still imports API-owned schemas directly. API-local `src/libs` holds DTOs, enums, and utilities; no top-level shared library was introduced. Extracting shared persistence/domain code is a proposal, not an accepted implementation task.

The WebSocket gateway remains a global broadcast implementation with a short in-memory message history. Private persistent guest–host messaging is not implemented. Notification and notice schemas exist; that does not establish a complete booking notification workflow.

## GraphQL changes

**Operation renames: none.** Resolver fields, DTOs, enum values, guards, and domain behavior were preserved. Current operation inventory and frontend implications are in [FRONTEND_MIGRATION.md](FRONTEND_MIGRATION.md). Future reservation and availability operations have no approved names or contracts.

## MongoDB schemas and collections

The [schemas directory](../apps/kostay-api/src/schemas) still declares `members`, `properties`, `boardArticles`, `comments`, `likes`, `views`, `follows`, `notifications`, and `notices`. No collection, field, index, or schema migration was performed. Property fields such as `propertyPrice`, `propertyRent`, `propertyBarter`, and `soldAt` retain their original meaning.

The user approved a URI database-path change `/Nestar` → `/Kostay` for MONGO_DEV and MONGO_PROD. At implementation time both paths already used `/Kostay`, so no environment edit was needed. Changing a URI selects a database; it does not migrate data. No data migration or database-content verification was performed. Credentials and full URIs are intentionally omitted.

## Compatibility notes

- GraphQL contracts, HTTP routes, WebSocket interfaces, authentication, collections, and domain logic remain unchanged; HTTP welcome text now says Kostay.
- Environment keys remain PORT_API, PORT_BATCH, MONGO_DEV, MONGO_PROD, SECRET_TOKEN, and NODE_ENV as applicable.
- Deployment scripts outside this repository may still reference old app or output paths; inspect them before deployment. No external deployment was performed.
- Existing real estate clients need no GraphQL field renames for this branding phase. They do not gain booking capability from the rename.
- Application builds/typechecks passed historically; lint and root test typechecks have known failures. See [validation evidence](COMPLETED_TASKS.md#validation-status).

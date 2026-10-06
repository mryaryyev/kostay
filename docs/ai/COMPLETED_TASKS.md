# Completed session tasks

Record of completed work, in order: the Nestar → Kostay rename (October 4, 2026, Asia/Seoul), backend Phase 1 and Phase 2 (October 5-7) and the frontend migration steps (October 7). The rename tables below are the historical rename diff; creation of the six handoff documents is a separate documentation-only change.

## Completed refactors

- Renamed API and batch directories and Nest project identifiers: Nestar → Kostay.
- Updated root package/lockfile identity, npm script targets, Nest source/configuration paths, and TypeScript output directories.
- Updated batch imports to the renamed API directory without extracting shared libraries.
- Changed API/batch welcome text to Kostay; updated existing greeting assertions and batch test description.
- Corrected the stale `NestarBatchModule` test import to the existing `BatchModule` export.
- Inspected MongoDB URI database paths: both already used `/Kostay`. No environment edit or data migration occurred.
- Inspected monorepo/domain structure and identified booking functionality as future work.

## Files with content changes

Counts below are the historical rename diff, not the size of this documentation update. Links point to current paths. Seven content-changed files also moved; three root files changed in place.

| File                                                        | Before → after                                                        |   Added | Removed |
| ----------------------------------------------------------- | --------------------------------------------------------------------- | ------: | ------: |
| [package.json](../package.json)                             | `nestar` package/app targets → `kostay`                               |      +5 |      -5 |
| [package-lock.json](../package-lock.json)                   | Root package name `nestar` → `kostay`                                 |      +2 |      -2 |
| [nest-cli.json](../nest-cli.json)                           | Nestar project keys and paths → Kostay                                |     +11 |     -11 |
| [API tsconfig](../apps/kostay-api/tsconfig.app.json)        | Output `dist/apps/nestar-api` → `dist/apps/kostay-api`                |      +1 |      -1 |
| [API service](../apps/kostay-api/src/app.service.ts)        | Welcome text Nestar → Kostay                                          |      +1 |      -1 |
| [API e2e test](../apps/kostay-api/test/app.e2e-spec.ts)     | `Hello World!` assertion → Kostay API greeting                        |      +1 |      -1 |
| [Batch tsconfig](../apps/kostay-batch/tsconfig.app.json)    | Output `dist/apps/nestar-batch` → `dist/apps/kostay-batch`            |      +1 |      -1 |
| [Batch module](../apps/kostay-batch/src/batch.module.ts)    | Schema imports `nestar-api` → `kostay-api`                            |      +2 |      -2 |
| [Batch service](../apps/kostay-batch/src/batch.service.ts)  | Four API imports and welcome text → Kostay                            |      +5 |      -5 |
| [Batch e2e test](../apps/kostay-batch/test/app.e2e-spec.ts) | Module import/reference, describe label, greeting assertion corrected |      +4 |      -4 |
| **Total**                                                   | **10 content-changed files**                                          | **+33** | **-33** |

There were **89 affected files**: 10 with content changes plus 79 additional move-only files. In total, 86 files moved under `apps/nestar-api` → `apps/kostay-api` and `apps/nestar-batch` → `apps/kostay-batch` (7 edited + 79 unchanged).

[auth.guard.ts](../apps/kostay-api/src/components/auth/guards/auth.guard.ts) and [roles.guard.ts](../apps/kostay-api/src/components/auth/guards/roles.guard.ts) were move-only: no content or authentication/authorization behavior changes. Domain modules, DTOs, schemas, collections, GraphQL operation names, and dependency versions were preserved.

## Validation status

Historical results from the rename implementation; these checks were not rerun as part of writing documentation.

| Check                                                       | Result                                                                                 |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| API TypeScript check                                        | Passed                                                                                 |
| Batch TypeScript check                                      | Passed                                                                                 |
| API Nest build                                              | Passed; expected `dist/apps/kostay-api/main.js` verified                               |
| Batch Nest build                                            | Passed; expected `dist/apps/kostay-batch/main.js` verified                             |
| Non-fixing ESLint                                           | 17 errors before and after; normalized diagnostics identical                           |
| Root TypeScript check including tests                       | 3 baseline errors → 2; stale batch module export error fixed                           |
| Rename-only content verification                            | Application file contents matched expected substitutions                               |
| Residual maintained-source Nestar search / whitespace check | No residual branding found in searched maintained source; diff whitespace check passed |
| Runtime end-to-end tests                                    | Not run; no claim of runtime/database integration verification                         |

The two remaining root type errors are the API test import from `supertest/types` (TS2307) and the batch test namespace-style Supertest import being non-callable (TS2349). The 17 lint errors concern unsafe typing/calls/returns and unused variables in existing auth, schema, socket, batch, and test code; they were not introduced by the rename.

Commands used (local tools, no automatic fixes):

```sh
./node_modules/.bin/eslint 'apps/**/*.ts'
./node_modules/.bin/tsc --noEmit --incremental false -p tsconfig.json
./node_modules/.bin/tsc --noEmit --incremental false -p apps/kostay-api/tsconfig.app.json
./node_modules/.bin/tsc --noEmit --incremental false -p apps/kostay-batch/tsconfig.app.json
./node_modules/.bin/nest build kostay-api
./node_modules/.bin/nest build kostay-batch
```

The package lint script includes `--fix`; the direct command above intentionally avoided broad rewrites. See [next steps](NEXT_STEPS.md) for remaining cleanup.

## Phase 1: MongoDB property changes (October 5, 2026)

- `PropertyStatus` is now `ACTIVE`, `INACTIVE`, `DELETE` (`SOLD` removed).
- `propertyPrice` renamed to `pricePerNight`; required `maxGuests` added; optional `constructedAt` kept.
- Removed `propertyRent`, `propertyBarter`, `soldAt`, the `options` filter and `periodsRange`.
- Added `guestsCount` search filter (`maxGuests >= guestsCount`).
- `memberProperties` counts non-deleted properties (ACTIVE + INACTIVE) and only decreases on DELETE.
- `deletedAt` is set by the server when status becomes DELETE.
- Owners/admins can edit ACTIVE and INACTIVE properties (reactivation is possible).
- Added non-unique indexes on `properties`; the old unique sale-price index is no longer declared. An existing database index is not dropped automatically.
- No transactions, PostgreSQL, bookings or payments yet.
- Validation: both `tsc` checks and `npm run build` pass.

## Phase 2, step 1: PostgreSQL connection (October 6, 2026)

- Added `typeorm`, `pg` and `@nestjs/typeorm`; PostgreSQL (Neon) connects through `POSTGRES_DEV` in `.env` (`sslmode=verify-full`).
- Split `database/` into `mongo/` and `postgres/` modules; `DatabaseModule` only aggregates them.
- No entities, enums or migrations yet.

## Phase 2, step 2: Booking and payment tables (October 6, 2026)

- Added `Booking` and `Payment` TypeORM entities under `database/postgres/entities`.
- `bookings.property_id` and `bookings.member_id` store Mongo ids as `varchar(24)` (no FK); `payments.booking_id` is a real FK.
- Added `data-source.ts`, migration scripts, and the `CreateBookingsAndPayments` migration (applied to Neon).
- `BookingModule` registers the entities; no service, resolver or mutations yet.

## Phase 2, step 3: Booking logic (October 6, 2026)

- `createBooking`: validates dates, `maxGuests` and host ≠ guest, checks overlapping PENDING/CONFIRMED bookings in PostgreSQL, calculates `total_price` from `pricePerNight`.
- `getMyBookings` (guest) and `getHostBookings` (agent; host's property ids come from MongoDB, bookings from PostgreSQL).
- `cancelBooking` (guest, PENDING/CONFIRMED only) and `confirmBooking` (host, PENDING only).
- A booking never changes `propertyStatus`; tested manually with Postman.

## Phase 2, step 4: Payments (October 7, 2026)

- `createPayment`: only the booking owner, only for a CONFIRMED booking; amount comes from `bookings.total_price` on the server. Payment is simulated (no gateway) and saved as SUCCEEDED.
- Double payment is blocked (row lock inside a PostgreSQL transaction).
- `cancelBooking` runs in a transaction: booking becomes CANCELLED and a SUCCEEDED payment becomes REFUNDED (full refund).
- Booking lists now return `paymentStatus` (null when unpaid).
- Tested manually with Postman.

## Frontend migration: `kostay-next` (October 7, 2026)

Repository `kostay-next` (Next.js Pages Router, Apollo, MUI/SCSS, Yarn only, manual GraphQL types, no codegen), branch `modification`. Steps 1-3 were committed together in one commit; the per-step counts below come from the migration agent's step reports. The agent made no edits before approval and stopped after each step. Backend contract: [FRONTEND_MIGRATION.md](FRONTEND_MIGRATION.md).

### Step 1: Baseline

- `yarn tsc --noEmit --incremental false` baseline captured before any edit.

### Step 2: Property contract (23 files, +93/−423)

- GraphQL documents, enums, types and consumers moved to `pricePerNight`, required `maxGuests` and `INACTIVE` (replacing `propertyPrice` and `SOLD`).
- Removed `propertyRent`, `propertyBarter`, `soldAt`, `search.options` and `search.periodsRange` from client types, documents and screens. `propertyBeds` and `propertyRooms` are unchanged (still part of the backend contract).
- Touched: `apollo/{admin,user}/{mutation,query}.ts`, `libs/enums/property.enum.ts`, `libs/types/property/*`, `libs/config.ts`, property filter/card/list components, `pages/property/{index,detail}.tsx`, My Page (`AddNewProperty`, `MyProperties`, `PropertyCard`) and the admin property list.
- Validation: typecheck passed; grep for removed fields clean; site checked manually in the browser.

### Step 3: Discovery and KRW formatting (18 files, +370/−548)

- Guest count filter (`search.guestsCount`); price range is sent only when both bounds are valid; safe URL query normalization; filter routing consolidated so sort, pagination and navigation keep the filters.
- Shared `formatKRW` helper in `libs/utils.ts` (`Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 })`, no conversion). Prices render as `₩… / night` on the homepage cards, property list and detail, My Properties and the admin list.
- Desktop SCSS adjustments only; mobile placeholders unchanged.
- Validation: typecheck passed; `git diff --check` passed; 32 in-memory normalization/formatting checks passed (no test files added); desktop SCSS compiled; grep for old fields, ungated `pricePerNight` output and `toISOString` clean; filters, sorting, pagination, bad URL input and price display checked manually in the browser.

### Fix outside the steps

- `MemberFollowings.tsx` and `MemberFollowers.tsx`: the refetch effect now skips until the member id exists. Before, `getMemberFollowings` received an empty id and the backend threw a BSON ObjectId error. This was an existing Nestar bug, not a migration regression.

### Open frontend items

- Step 4 (create/edit/lifecycle), Step 5 (branding and terminology, split 5A/5B/5C) and Step 6 (final verification) are not done.
- A dev-only Apollo overlay ("Cannot convert object to primitive value", raised while Apollo formats a cache data-loss warning) was seen once; the cause is not identified.
- Mobile screens remain untouched Nestar placeholders.
- Booking screens are not built yet.

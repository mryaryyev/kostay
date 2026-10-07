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

Repository `kostay-next` (Next.js Pages Router, Apollo, MUI/SCSS, Yarn only, manual GraphQL types, no codegen), branch `modification`. Steps 1-3 were committed together in one commit; Steps 4 and 5A-5C were committed separately (5A `a855879`, 5C `cd96741`, 5B `0c1b5af`); the per-step counts below come from the migration agent's step reports. The agent made no edits before approval and stopped after each step. Backend contract: [FRONTEND_MIGRATION.md](FRONTEND_MIGRATION.md).

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

### Step 4: Host create/edit/lifecycle (4 files, +134/−40)

- `pricePerNight` and `maxGuests` are validated as positive whole numbers (strict digits-only parse, GraphQL Int range) before submit: Save stays disabled, an inline hint shows invalid input, and both submit handlers re-check before the mutation. No `NaN` or partly numeric input (`12abc`) reaches the server. New helpers `isPositiveInt` and `parsePositiveInt` in `libs/utils.ts`.
- Editor (`AddNewProperty`): `getProperty` is skipped in create mode; in edit mode, once the query finishes with an error or an empty result (INACTIVE or missing listing), a "only active listings can be edited" message with a link back replaces the form. The update payload is built as a new object (`_id` plus fields, no `memberId`) instead of mutating state.
- Lifecycle (`PropertyCard`, `MyProperties`): ACTIVE listings can be deactivated and INACTIVE listings reactivated through `updateProperty` with `propertyStatus`; edit and delete stay ACTIVE-only. The confirm text names the action only. Switching tabs resets to page 1, and the list steps back a page when a status change or delete empties the current page.
- No GraphQL documents, types, routes or enums changed; mobile placeholders unchanged.
- Validation: typecheck passed (`yarn tsc --noEmit --incremental false`); `git diff --check` passed; manual browser check: done (create, edit, invalid price/guests input, deactivate, reactivate, edit link for a paused listing).

### Step 5A: Branding: layout, navigation, locales (9 files, +45/−45)

- Locale values only (keys unchanged) in `public/locales/{en,kr,ru}/common.json`: Properties → Stays (숙소, Жильё), Agents → Hosts (호스트, Хозяева), plus "Stay type", "Find a Stay", "Home / Stays" and "Host Page". Navigation and banner titles pick these up through the existing `t(...)` calls.
- Page `<title>` and `meta title` Nestar → Kostay in `LayoutBasic`, `LayoutHome` and `LayoutFull`; `_document.tsx` keywords and EN/RU/KR description rewritten for Kostay stays with nightly KRW prices (no booking wording).
- Footer: copyright → Kostay, "Browse stays" / "All stays" (both are unlinked spans), "nee live" typo fixed, logo `alt="Kostay"`; header logo `alt="Kostay"`.
- No route, file, component, variable, GraphQL operation or `AGENT` role renames; mobile placeholders unchanged; logo artwork not changed.
- Validation: typecheck passed (`yarn tsc --noEmit --incremental false`); `git diff --check` passed; all three locale files parse as JSON; grep for `Nestar`/`nestar` in the changed files clean; manual browser check: pending.

### Step 5B: Stays/Hosts text: discovery, profile, management (23 files, +58/−54)

- Homepage sections: Trending Stays, Popular stays, Top stays, Top Hosts ("Our top hosts are always ready to welcome you", "See All Hosts").
- Property list, filter and detail: loading/error/empty texts and the result count use "stays"; "Stay Type", "Stay Description", "Stay Details", "Stay Size", "More stays nearby"; the unavailable message and its "Back to stays" link.
- Host pages: search placeholder "Search for a host", "No hosts found!", host card label "Host", "No stays found!" and "Total {n} stay(s) available" on the host detail. Community page name "Kostay Community".
- My Page: menu "Add Stay" / "My Stays", "My Stays" title, "Add New Stay", "Stay Description", "Upload photos of your stay", listing alerts and confirm text, "No recently visited stays found!", recently visited and favorite counts in stay(s). Member pages: menu and title "Stays", empty text, counts `{total} stay(s) available` with correct plurals; the articles count now says "articles".
- Signup: "Kostay" next to the logo, user-type label "Host" (value still `AGENT`). Admin: column label "HOST", "Stay List" heading, user filter item "Host" (value still `AGENT`).
- Each string was checked in context before the change; only plain visible text was changed. No key, value, id, href, className, category, comparison, route, file, component, variable, translation key, GraphQL operation or `AGENT` role was renamed.
- Validation: typecheck passed (`yarn tsc --noEmit --incremental false`); `git diff --check` passed; visible-text scan re-run; manual browser check: pending.
- Remaining "Property/Properties/Agent/Agents/Nestar" occurrences after the scan:
  - Admin side menu `AdminMenuList.tsx` `title: 'Properties'`: open item. The string is also the menu key (`setClickMenu`, sub-menu map), so it needs a separate label field before it can change.
  - `pages/about/index.tsx` "Property Ready", "Property Management" (×3), "Browse through more properties": Step 5C.
  - Mobile placeholders (unchanged by rule): "PROPERTY CARD", "PROPERTIES FILTER", "NESTAR PROPERTIES MOBILE" (×2), "NESTAR FOLLOWS MOBILE" (×2), "AGENT CARD", "MOBILE PROPERTY CARD", "NESTAR MY FAVORITES MOBILE" (×2), "ADD NEW PROPERTY MOBILE PAGE", "PROPERTIES MOBILE", "AGENTS PAGE MOBILE", "PROPERTY DETAIL PAGE", "AGENT DETAIL PAGE MOBILE"; `mypage/Article.tsx` "PROPERTY CARD".

### Step 5C: Branding: informational pages (3 files, +130/−146)

- `pages/about/index.tsx`: copy rewritten for Kostay stays and hosts. The statistics now show figures that are true for the product (9 regions, 3 stay types, nightly prices in KRW); the partner logos section was removed because there are no partners.
- `libs/components/cs/Faq.tsx`: every category keeps its 10 entries. Entries that described features that do not exist (membership, community and policy claims) were rewritten honestly, for example "There is no separate guidelines page yet. Please be respectful to other members." New entries explain stays and hosts, nightly KRW pricing, and that payments are simulated; "Do I need an account to book a stay?" was added.
- `libs/components/cs/Notice.tsx`: two notices dated 07.10.2026.
- No route, file, component, variable, translation key, GraphQL operation or `AGENT` role renames; mobile placeholders unchanged.
- Validation: typecheck passed (`yarn tsc --noEmit --incremental false`); `git diff --check` passed; visible-text scan clean for the About, FAQ and Notice pages; manual browser check: pending.
- FAQ answers about booking and payment must be updated when the booking screens ship.

### Homepage visuals and search bar (October 7)

- Header/footer logo replaced with a Kostay mark (`logoWhite.svg`) and an inline `KostayLogo` component with a hover animation. `logoText.svg` and `favicon.svg` still show Nestar (open item).
- Homepage 3D gallery (`FiberContainer`): `public/img/fiber/img1-8.jpg` replaced in place with stay photos (Unsplash License), each cropped to 1600x1000; no code change. Total image size went from about 5.9 MB to 2.3 MB.
- Home search bar (`HeaderFilter`, 4 files, +331/-11): added Dates (check-in/check-out, native date inputs, plain `YYYY-MM-DD`) and Guests (stepper 1-16, uses the existing `search.guestsCount` filter) between Stay type and Rooms. Fixed the stray `}` after the Rooms label and renamed the "Property type" label to "Stay type". Dates go to `/property` as separate `checkIn`/`checkOut` URL params, not in the GraphQL input; the catalog shows them with an "availability filtering is coming soon" note until the backend availability filter exists.
- Validation: typecheck passed (`yarn tsc --noEmit --incremental false`); manual browser check: pending.

### Fix outside the steps

- `MemberFollowings.tsx` and `MemberFollowers.tsx`: the refetch effect now skips until the member id exists. Before, `getMemberFollowings` received an empty id and the backend threw a BSON ObjectId error. This was an existing Nestar bug, not a migration regression.

### Open frontend items

- Step 6 (final verification) is not done. The browser check for Steps 5A-5C is pending.
- Logo artwork still says "Nestar" (asset swap needed); placeholder contact details remain on the About page and in the footer; the admin side menu label "Properties" is unchanged (it is also a lookup key).
- A dev-only Apollo overlay ("Cannot convert object to primitive value", raised while Apollo formats a cache data-loss warning) was seen once; the cause is not identified.
- Mobile screens remain untouched Nestar placeholders.
- Booking screens are not built yet.
- Backend availability filter for `getProperties` (`checkIn`/`checkOut`) is not built; until it exists, the homepage dates only appear in the URL and are not sent to GraphQL.

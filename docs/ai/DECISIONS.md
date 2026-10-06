# Migration decisions

Recorded October 4-7, 2026 (Asia/Seoul). Status distinguishes accepted choices from proposals and unresolved questions. This is a record of the session, not approval to implement future domain changes.

## Phase 1 decisions (October 5)

- Property stays the main entity, now meaning a rentable accommodation. Names and `PropertyType`/`PropertyLocation` values are unchanged.
- `SOLD` is removed. `INACTIVE` means the host paused the listing; it does not mean rented.
- Rented dates are not stored on the property. Availability will come from `bookings` in PostgreSQL (Phase 2); a booking never changes `propertyStatus`.
- `memberProperties` counts non-deleted properties (ACTIVE + INACTIVE) and only decreases on DELETE.
- No MongoDB transactions or sessions for now. Keep services simple.
- `deletedAt` is set by the server, never sent by the client.
- Fresh development data; no legacy data conversion or compatibility aliases.
- This supersedes the "Preserve collections, schemas, and indexes" decision below for the property collection only.

## Phase 2 decisions (October 6-7)

- Bookings and payments live in PostgreSQL (Neon); Mongo ids are stored as `varchar(24)` without foreign keys. Availability is computed in service code from two queries.
- Bookable inventory is the whole property (no separate rooms in this release).
- Host approval: a booking starts PENDING and the host confirms it (CONFIRMED). No instant booking.
- Booking status and payment status are separate; a booking is never given a "PAID" status.
- Overlap rule: only PENDING and CONFIRMED bookings block dates; check-out day is free.
- Money amounts are always calculated on the server.
- Payments are simulated (no gateway, saved as SUCCEEDED); cancelling a paid booking refunds it in full in the same transaction.
- All prices and payment amounts are KRW (whole won, no conversion). The frontend formats them with a single helper.
- Dates are plain `YYYY-MM-DD` strings, never `toISOString()`.
- Schema changes go through TypeORM migrations (`synchronize: false`).

## Frontend decisions (October 7)

- Property migration comes first; booking screens are a separate later phase.
- Desktop first; mobile placeholders stay unchanged until the desktop flows are final.
- KRW per night with one shared formatter (`Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 })`); no currency conversion.
- Visible UI text says "Stays" and "Hosts" only. Routes, file names, component names, variables, GraphQL operations and the `AGENT` role are not renamed. "Comment" stays.
- Hosts edit ACTIVE listings only, because `getProperty` returns only ACTIVE properties. Deactivate and reactivate use `updateProperty` with `propertyStatus`; DELETE is separate.
- `pricePerNight` and `maxGuests` are validated as positive finite integers before submit.
- Yarn only; typecheck with `yarn tsc --noEmit --incremental false`; one step at a time with approval before edits and a report after each step.
- The frontend agent appends to [COMPLETED_TASKS.md](COMPLETED_TASKS.md) only after the steps are verified, and only by appending.

## Accepted decisions

| Decision                                                                                    | Status                                    | Rationale                                                             | Risks / alternatives                                                                                               |
| ------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Use Kostay as the target name                                                               | Accepted; implemented                     | User confirmed Petoria was a naming mistake                           | A later rebrand would require another coordinated path/configuration update                                        |
| Perform a safe naming layer first                                                           | Accepted; completed                       | Isolate project branding from business behavior                       | Booking remained absent in that phase; alternative was a larger domain migration                                   |
| Rename both app directories and Nest project identifiers                                    | Accepted; completed                       | Keep package, source, imports, build outputs, and commands consistent | External deployment references may need updates; alternative was retaining legacy internal names                   |
| Preserve GraphQL contracts, routes, domain enums, and guards                                | Accepted for the rename phase             | Avoid breaking existing clients during branding                       | The property contract changed later in Phase 1 (see above); real estate terminology persists elsewhere             |
| Retain NestJS, MongoDB/Mongoose, and dependency versions                                    | Accepted for this phase                   | No stack change was needed to rename the project                      | Existing technical debt remains; upgrades should be separate work. PostgreSQL was added in Phase 2 for bookings    |
| Preserve collections, schemas, and indexes                                                  | Accepted for the rename phase             | Avoid accidental data-model changes                                   | Superseded for `properties` in Phase 1; other collections are unchanged                                            |
| Select `/Kostay` in both MongoDB URI database paths                                         | Accepted; already present at execution    | Align selected database name with project identity                    | Selecting a different database does not copy data; overrides the initial proposal to keep database names unchanged |
| Preserve environment keys and connection details other than the approved database path      | Accepted; `POSTGRES_DEV` added in Phase 2 | Avoid unnecessary deployment configuration changes                    | External environment configuration has not been audited; `POSTGRES_PROD` is not set up                             |
| Correct stale batch test module import and greeting assertions                              | Accepted; completed                       | Make existing tests reference the real module and new branding        | Other pre-existing Supertest typing issues remain                                                                  |
| Report baseline lint/type failures separately                                               | Accepted; completed                       | Keep rename scope bounded and avoid claiming a clean test suite       | Cleanup remains necessary; alternative is a separately authorized quality pass                                     |
| Preserve user edits; provide clickable file links, before → after mappings, and line counts | Accepted reporting convention             | Make changes reviewable                                               | Move-only files must not be counted as wholesale content rewrites                                                  |
| Create six documentation files only in this follow-up                                       | Accepted                                  | Capture handoff without changing application behavior                 | Documentation must be updated as implementation progresses                                                         |

## Proposals and unresolved questions

| Topic                                                     | Status                                | Reason to consider it                                                                                 | Risks / alternatives / required decision                                                              |
| --------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Extract shared domain/persistence library                 | Proposal, not implemented             | Batch imports API-owned schemas and DTOs                                                              | Requires TypeScript/build changes; retain direct imports until separately scoped                      |
| Hotel rooms as separate inventory                         | Unresolved                            | Whole-property booking is accepted; rooms would need new inventory                                    | Decide only if rooms or multi-unit listings are needed; affects availability semantics                |
| Real online payment provider                              | Unresolved                            | Payments are simulated today                                                                          | Provider, holds, partial refunds, cancellation windows and reconciliation are unselected              |
| Database-enforced concurrency protection                  | Proposed requirement; not implemented | Concurrent requests must not double-book inventory                                                    | Current overlap check runs in service code; consider an exclusion constraint or locking design        |
| Host/guest capabilities and booking-verified reviews      | Proposal                              | Existing AGENT role and comments are real estate/social concepts                                      | Avoid cosmetic enum or comment renames masquerading as new domain behavior                            |
| Future bookings when a host deactivates or deletes a stay | Unresolved                            | A booking never changes `propertyStatus`, but hosts can pause or delete                               | Decide whether to block, cancel or honor existing bookings                                            |
| Owner-side access to INACTIVE properties                  | Unresolved                            | `getProperty` returns only ACTIVE, so paused listings cannot be edited or reactivated from the editor | Backend change to `getProperty` or a new host query                                                   |
| Data preservation for production                          | Unresolved                            | Development uses fresh data (Phase 1); production needs a plan                                        | Fresh start, data-only migration, or staged compatibility need explicit selection                     |
| Frontend booking screens and routes                       | Proposal                              | Backend booking contract exists; `kostay-next` inspected                                              | Routes and UI are undecided; build after frontend Step 6; availability search waits for backend items |

See [backend state](BACKEND_MIGRATION.md), [frontend plan](FRONTEND_MIGRATION.md), and [next tasks](NEXT_STEPS.md).

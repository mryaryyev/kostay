# Next steps: October 7, 2026

Timezone: Asia/Seoul. This is a prioritized handoff, not a scheduled automation or authorization to change domain behavior. Completed work is documented in [COMPLETED_TASKS.md](COMPLETED_TASKS.md).

## Phase 2

Done: PostgreSQL foundation, booking/payment entities and migration, booking logic, payments (see [COMPLETED_TASKS.md](COMPLETED_TASKS.md)). Remaining:

- `getBookedDates(propertyId)` for the property calendar.
- Date availability filter in `getProperties` (booked property ids from PostgreSQL excluded in the Mongo query).
- Batch jobs (`kostay-batch`): mark past CONFIRMED bookings COMPLETED; cancel stale PENDING bookings.
- Decide what happens to future bookings when a host deactivates or deletes a property.
- Concurrency protection for simultaneous overlapping bookings (for example a PostgreSQL exclusion constraint); the current overlap check runs in service code only.
- Owner-side load of an INACTIVE property: `getProperty` returns only ACTIVE listings, so the host editor cannot open a paused listing. Decide whether `getProperty` (or a new host query) may return the owner's INACTIVE property.
- BOOKING notifications, admin booking list, `POSTGRES_PROD` / Neon production branch.

## Backend cleanup

| Priority | Task                                                                                      | Completion criterion                                                                                  |
| -------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| P1       | Reproduce and scope the two existing Supertest type errors                                | Identify minimal test-only corrections; root typecheck passes after a separately authorized cleanup   |
| P1       | Triage the 17 existing lint errors                                                        | Classify safe unused-import cleanup versus typing/behavior-sensitive changes; no blind global autofix |
| P2       | Inspect deployment/start command references outside tracked app configuration             | Confirm consumers use `kostay-api`, `kostay-batch`, and new output paths                              |
| P2       | Verify intended database selection in the target environment without exposing credentials | Confirm `/Kostay` is intended; do not assume existing Nestar data was copied                          |
| P3       | Evaluate shared-library extraction                                                        | Produce a separate proposal covering API/batch boundaries and TypeScript/build impacts                |

## Frontend migration

Done: repository inspected, baseline captured, property contract migrated, discovery filters and KRW formatter (frontend Steps 1-3, see [COMPLETED_TASKS.md](COMPLETED_TASKS.md)).

| Priority | Task                                                                                                            | Completion criterion                                                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Step 4: host create/edit/lifecycle (deactivate/reactivate, edit ACTIVE only, validate price and guests)         | `pricePerNight` and `maxGuests` must be positive finite integers before submit; no `NaN`; manual create/edit/deactivate/reactivate flow works |
| P2       | Step 5A-5C: Kostay branding and "Stays"/"Hosts" visible text (layout, discovery/profile copy, About/FAQ/Notice) | No route, file, variable or GraphQL renames; no unsupported booking labels                                                                    |
| P2       | Step 6: final verification and documentation record                                                             | Typecheck passes; Network tab shows no GraphQL `errors` on the main flows                                                                     |
| P2       | Booking screens (separate phase) against the implemented booking contract                                       | Each screen maps to an operation in [FRONTEND_MIGRATION.md](FRONTEND_MIGRATION.md); availability search waits for the backend items above     |
| P3       | Investigate the dev-only Apollo overlay ("Cannot convert object to primitive value")                            | Find which query triggers the cache data-loss warning; add a `typePolicies` merge for the list wrapper type if needed                         |
| P3       | Mobile screens                                                                                                  | Replace Nestar mobile placeholders after the desktop flows are final                                                                          |

## Testing

| Priority | Task                                                                      | Completion criterion                                                                           |
| -------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| P1       | Rerun non-fixing lint, root/app typechecks after cleanup                  | Report new results separately from historical rename results                                   |
| P1       | Establish an isolated test database/configuration before runtime e2e runs | No production writes or unintended scheduled ranking jobs                                      |
| P2       | Run existing API/batch e2e suites after typing/setup fixes                | Correct greetings, cleanup of application connections, reproducible results                    |
| P2       | Validate GraphQL/client compatibility and both build outputs              | Representative existing operations still work; app paths match scripts                         |
| P3       | Design booking tests when tests are requested                             | Cover overlapping reservations, adjacent stays, ownership, cancellation, and price consistency |

## Documentation

| Priority | Task                                                                              | Completion criterion                                                                              |
| -------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| P1       | Keep decision statuses explicit                                                   | Suggestions never appear as accepted product requirements                                         |
| P2       | Replace starter README in a separately scoped update                              | Accurate architecture, commands, environment-key descriptions, and known failures without secrets |
| P2       | Record each frontend step in COMPLETED_TASKS after verification (Steps 4-6)       | Actual file counts and dated outcomes, appended without changing existing content                 |
| P2       | Record each implementation with clickable links and actual +added/-removed counts | Separate moved-only files from content changes                                                    |

## Product decisions

Decided and implemented in Phase 2: whole-property bookings; host approval (PENDING → CONFIRMED); payments simulated, with the amount always calculated on the server; guest cancellation with a full refund of a paid booking; the check-out day is free for another guest's check-in; dates are plain `YYYY-MM-DD` strings. Decided for the frontend: KRW per night with one formatter, desktop first, visible "Stays"/"Hosts" terminology only. See [DECISIONS.md](DECISIONS.md).

Still open: rooms as separate inventory, cancellation windows and partial refunds, a real payment gateway, and the concurrency protection listed under Phase 2.

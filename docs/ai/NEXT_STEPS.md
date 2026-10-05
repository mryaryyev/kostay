# Next steps: October 5, 2026

Timezone: Asia/Seoul. This is a prioritized handoff, not a scheduled automation or authorization to change domain behavior. Completed work is documented in [COMPLETED_TASKS.md](COMPLETED_TASKS.md).

## Phase 2

- PostgreSQL foundation (TypeORM, `bookings`, `payments`, enums, migrations).

## Backend cleanup

| Priority | Task                                                                                      | Completion criterion                                                                                  |
| -------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| P1       | Reproduce and scope the two existing Supertest type errors                                | Identify minimal test-only corrections; root typecheck passes after a separately authorized cleanup   |
| P1       | Triage the 17 existing lint errors                                                        | Classify safe unused-import cleanup versus typing/behavior-sensitive changes; no blind global autofix |
| P2       | Inspect deployment/start command references outside tracked app configuration             | Confirm consumers use `kostay-api`, `kostay-batch`, and new output paths                              |
| P2       | Verify intended database selection in the target environment without exposing credentials | Confirm `/Kostay` is intended; do not assume existing Nestar data was copied                          |
| P3       | Evaluate shared-library extraction                                                        | Produce a separate proposal covering API/batch boundaries and TypeScript/build impacts                |

## Frontend migration

| Priority | Task                                                              | Completion criterion                                                    |
| -------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| P1       | Locate and inspect the Next.js repository                         | Verified route/component/GraphQL inventory replaces conceptual mappings |
| P1       | Capture baseline checks and key flows                             | Known failures separated from migration regressions                     |
| P2       | Scope Nestar → Kostay branding changes                            | Exact file list and before → after mappings; unchanged routes/contracts |
| P2       | Implement branding when authorized and validate navigation/layout | No unsupported booking labels or accidental sale-price relabeling       |
| P3       | Propose booking screens after product decisions                   | Map each proposed screen to an agreed backend capability                |

## Testing

| Priority | Task                                                                      | Completion criterion                                                                           |
| -------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| P1       | Rerun non-fixing lint, root/app typechecks after cleanup                  | Report new results separately from historical rename results                                   |
| P1       | Establish an isolated test database/configuration before runtime e2e runs | No production writes or unintended scheduled ranking jobs                                      |
| P2       | Run existing API/batch e2e suites after typing/setup fixes                | Correct greetings, cleanup of application connections, reproducible results                    |
| P2       | Validate GraphQL/client compatibility and both build outputs              | Representative existing operations still work; app paths match scripts                         |
| P3       | Design booking tests once domain behavior is selected                     | Cover overlapping reservations, adjacent stays, ownership, cancellation, and price consistency |

## Documentation

| Priority | Task                                                                              | Completion criterion                                                                              |
| -------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| P1       | Keep decision statuses explicit                                                   | Suggestions never appear as accepted product requirements                                         |
| P2       | Replace starter README in a separately scoped update                              | Accurate architecture, commands, environment-key descriptions, and known failures without secrets |
| P2       | Update frontend mappings and validation evidence after inspection                 | Actual relative links and dated outcomes                                                          |
| P2       | Record each implementation with clickable links and actual +added/-removed counts | Separate moved-only files from content changes                                                    |

## Product decisions required before booking implementation

Resolve bookable inventory (whole property, rooms, or both), instant confirmation versus host approval, payments in v1, cancellation rules, guest/host capabilities, pricing/timezone semantics, and data/client compatibility. Then design availability concurrency protection and reservation APIs. None of these choices was finalized by the safe rename; the provisional whole-property/no-payment suggestion is not a requirement.

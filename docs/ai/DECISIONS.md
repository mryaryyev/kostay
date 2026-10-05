# Migration decisions

Recorded October 4, 2026 (Asia/Seoul). Status distinguishes accepted choices from proposals and unresolved questions. This is a record of the session, not approval to implement future domain changes.

## Phase 1 decisions (October 5)

- Property stays the main entity, now meaning a rentable accommodation. Names and `PropertyType`/`PropertyLocation` values are unchanged.
- `SOLD` is removed. `INACTIVE` means the host paused the listing; it does not mean rented.
- Rented dates are not stored on the property. Availability will come from `bookings` in PostgreSQL (Phase 2); a booking never changes `propertyStatus`.
- `memberProperties` counts non-deleted properties (ACTIVE + INACTIVE) and only decreases on DELETE.
- No MongoDB transactions or sessions for now. Keep services simple.
- `deletedAt` is set by the server, never sent by the client.
- Fresh development data; no legacy data conversion or compatibility aliases.
- This supersedes the "Preserve collections, schemas, and indexes" decision below for the property collection only.

## Accepted decisions

| Decision | Status | Rationale | Risks / alternatives |
|---|---|---|---|
| Use Kostay as the target name | Accepted; implemented | User confirmed Petoria was a naming mistake | A later rebrand would require another coordinated path/configuration update |
| Perform a safe naming layer first | Accepted; completed | Isolate project branding from business behavior | Booking remains absent; alternative was a larger domain migration |
| Rename both app directories and Nest project identifiers | Accepted; completed | Keep package, source, imports, build outputs, and commands consistent | External deployment references may need updates; alternative was retaining legacy internal names |
| Preserve GraphQL contracts, routes, domain enums, and guards | Accepted; completed | Avoid breaking existing clients during branding | Real estate terminology persists; alternative is an explicitly versioned domain/API migration |
| Retain NestJS, MongoDB/Mongoose, and dependency versions | Accepted for this phase | No stack change was needed to rename the project | Existing technical debt remains; upgrades should be separate work |
| Preserve collections, schemas, and indexes | Accepted; completed | Avoid accidental data-model changes | Sale-oriented fields are not booking inventory; alternatives require deliberate migrations |
| Select `/Kostay` in both MongoDB URI database paths | Accepted; already present at execution | Align selected database name with project identity | Selecting a different database does not copy data; overrides the initial proposal to keep database names unchanged |
| Preserve environment keys and connection details other than the approved database path | Accepted; no environment edit needed | Avoid unnecessary deployment configuration changes | External environment configuration has not been audited |
| Correct stale batch test module import and greeting assertions | Accepted; completed | Make existing tests reference the real module and new branding | Other pre-existing Supertest typing issues remain |
| Report baseline lint/type failures separately | Accepted; completed | Keep rename scope bounded and avoid claiming a clean test suite | Cleanup remains necessary; alternative is a separately authorized quality pass |
| Preserve user edits; provide clickable file links, before → after mappings, and line counts | Accepted reporting convention | Make changes reviewable | Move-only files must not be counted as wholesale content rewrites |
| Create six documentation files only in this follow-up | Accepted | Capture handoff without changing application behavior | Documentation must be updated as implementation progresses |

## Proposals and unresolved questions

| Topic | Status | Reason to consider it | Risks / alternatives / required decision |
|---|---|---|---|
| Extract shared domain/persistence library | Proposal, not implemented | Batch imports API-owned schemas and DTOs | Requires TypeScript/build changes; retain direct imports until separately scoped |
| Whole properties versus hotel rooms versus both | Unresolved | Defines bookable inventory and availability semantics | Whole-property reservations were only a provisional suggestion, not an accepted requirement |
| Instant booking versus host approval | Unresolved | Determines reservation states and contention behavior | Must decide before reservation APIs are specified |
| Online payments in first release | Unresolved | Determines holds, refunds, reconciliation, and provider integration | Reservations without payment were proposed; provider and money-flow design are unselected |
| Database-enforced concurrency protection | Proposed requirement for future bookings | Concurrent requests must not double-book inventory | Exact transaction/index/locking design depends on inventory; availability-read-then-insert alone is insufficient |
| Host/guest capabilities and booking-verified reviews | Proposal | Existing AGENT role and comments are real estate/social concepts | Avoid cosmetic enum or comment renames masquerading as new domain behavior |
| Compatibility and data preservation for domain migration | Unresolved | Branding compatibility does not settle future breaking changes | Fresh start, data-only migration, or fully staged compatibility need explicit selection |
| Frontend route/component mapping | Unverified proposal | No Next.js source was inspected in this workspace | Inventory actual files first; do not implement invented paths |

See [backend state](BACKEND_MIGRATION.md), [frontend plan](FRONTEND_MIGRATION.md), and [next tasks](NEXT_STEPS.md).

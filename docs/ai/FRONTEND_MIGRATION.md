# Next.js frontend migration plan

Status: in progress. The frontend repository `kostay-next` (Next.js Pages Router, Apollo, MUI/SCSS, Yarn only, manually maintained GraphQL types, no codegen) has been inspected and migrated step by step. Steps 1-3 (baseline, property contract, discovery and KRW pricing) are done; host listing management, branding and the booking screens are still open (see progress below and [COMPLETED_TASKS.md](COMPLETED_TASKS.md)). The backend uses Kostay branding; property contracts changed in Phase 1 and booking/payment contracts were added in Phase 2.

## Property contract update (Phase 1)

- `propertyPrice` → `pricePerNight`; required `maxGuests` on create.
- Removed `propertyRent`, `propertyBarter`, `soldAt`, `search.options`, `search.periodsRange`.
- `SOLD` → `INACTIVE`; sort key `propertyPrice` → `pricePerNight`.
- New optional filter `search.guestsCount`.
- `propertyBeds` and `propertyRooms` are unchanged.
- Update the client's manually maintained types and GraphQL documents (there is no codegen). Done in frontend Steps 2-3.

Backend facts the property screens depend on:

- `getProperty` returns only ACTIVE properties, so an INACTIVE listing cannot be loaded into the editor. The frontend therefore edits ACTIVE listings only; an owner-side load of INACTIVE listings would need a backend change (see [NEXT_STEPS.md](NEXT_STEPS.md)).
- `getAgentProperties` rejects the DELETE status.
- Owners and admins can set `propertyStatus` ACTIVE ↔ INACTIVE through `updateProperty` (deactivate / reactivate). DELETE is separate.
- Prices are whole KRW per night. The UI formats them with one shared helper (`formatKRW`) and does no currency conversion.

## Booking contract (Phase 2, PostgreSQL-backed)

All booking operations need a logged-in member. Dates are plain `YYYY-MM-DD` strings. Never send `toISOString()` (it shifts the day in Korea).

| Operation                   | Who                          | Arguments                                                                   | Returns                      |
| --------------------------- | ---------------------------- | --------------------------------------------------------------------------- | ---------------------------- |
| `createBooking` (mutation)  | any member except the host   | `input: BookingInput!` (`propertyId`, `checkIn`, `checkOut`, `guestsCount`) | `Booking` (status PENDING)   |
| `getMyBookings` (query)     | guest                        | `input: BookingsInquiry!` (`page`, `limit`, optional `status`)              | `Bookings` (`list`, `total`) |
| `getHostBookings` (query)   | AGENT                        | `input: BookingsInquiry!`                                                   | `Bookings`                   |
| `confirmBooking` (mutation) | AGENT, property owner        | `bookingId: String!`                                                        | `Booking` (CONFIRMED)        |
| `cancelBooking` (mutation)  | guest, own booking           | `bookingId: String!`                                                        | `Booking` (CANCELLED)        |
| `createPayment` (mutation)  | guest, own CONFIRMED booking | `input: PaymentInput!` (`bookingId`, `paymentMethod`)                       | `Payment`                    |

`Booking` fields: `id`, `propertyId`, `memberId`, `checkIn`, `checkOut`, `guestsCount`, `totalPrice`, `status`, `paymentStatus` (nullable), `createdAt`, `updatedAt`.

`Payment` fields: `id`, `bookingId`, `amount`, `currency`, `paymentMethod`, `status`, `paidAt` (nullable), `createdAt`.

Booking status flow: PENDING → CONFIRMED (host) → COMPLETED (not automated yet); PENDING/CONFIRMED → CANCELLED (guest). `paymentStatus`: null (unpaid), SUCCEEDED, REFUNDED. Cancelling a paid booking refunds it in full.

Rules the UI should reflect: guests cannot exceed `maxGuests`; check-out must be after check-in; check-in cannot be in the past; the check-out day can be another guest's check-in day; the amount is always calculated on the server; a booking never changes `propertyStatus`. Payment is simulated (no gateway yet).

Not available yet: booked dates for a property calendar and an availability filter on `getProperties`.

## Frontend rules

- Yarn only. Typecheck with `yarn tsc --noEmit --incremental false`. There is no ESLint configuration.
- Backend endpoint stays `http://localhost:3007/graphql` for development.
- Property migration first, desktop first; mobile placeholders stay unchanged for now.
- Visible UI text only: "Stays" and "Hosts". Routes, file names, component names, variables, GraphQL operations and the `AGENT` role are not renamed. "Comment" stays.
- One step at a time. The agent proposes a file-level plan, waits for approval, reports changed files with line counts and the typecheck result, and stops.

## Progress

| Step | Scope                                                                                                   | Status      |
| ---- | ------------------------------------------------------------------------------------------------------- | ----------- |
| 1    | Typecheck baseline                                                                                      | Done        |
| 2    | Property contract in documents, enums, types and 23 consumer files                                      | Done        |
| 3    | Guest filter, validated price range, safe URL parsing, shared `formatKRW`, desktop spacing              | Done        |
| 4    | Host create/edit/lifecycle: deactivate/reactivate, edit ACTIVE listings only, validate price and guests | Open        |
| 5A   | Branding: layout, navigation, locales                                                                   | Open        |
| 5B   | Branding: discovery, profile and management copy                                                        | Open        |
| 5C   | Branding: informational pages (About, FAQ, Notice)                                                      | Open        |
| 6    | Final verification and documentation record                                                             | Open        |
| 7    | Booking screens (date and guest picker, trips, host reservations, payment) against the contract above   | Not started |

Booking screens are a separate phase after Step 6. Availability search and a property calendar wait for the backend items in [NEXT_STEPS.md](NEXT_STEPS.md).

## Page/component mappings

| Nestar concept                      | Branding phase destination                        | Future booking proposal                                        |
| ----------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| Home, site header, footer, metadata | Same pages/components with Kostay branding        | Accommodation discovery after listing capabilities exist       |
| Property list and filters           | Same route and property contract (done)           | Date/guest-aware stay search                                   |
| Property detail/card                | Same data, nightly rate (done)                    | Stay detail/card with availability and nightly rate            |
| Agent directory/profile             | Keep existing role behavior; visible text "Hosts" | Host profiles after role/capability design                     |
| Agent property-management screen    | Same CRUD and permissions (Step 4)                | Host listing/calendar management                               |
| Favorites and visited listings      | Same property references and operations           | Saved accommodations after domain migration                    |
| Login/signup/profile                | Same member/authentication contract               | Guest/host onboarding if approved                              |
| Articles/comments/community         | Same workflows                                    | Separately decide retention and verified-review feature        |
| Admin screens                       | Same permissions and operations                   | Reservation oversight only after backend support               |
| No reservation screen yet           | No addition in the branding phase                 | Trips, booking detail, checkout/request flow; routes undecided |

## GraphQL query/mutation rename plan

**Branding-phase rename plan: none; every field below maps to itself.** Names were verified in backend resolvers. Do not rename `getAgents` to `getHosts`, or `createProperty` to a booking mutation, without a separately approved backend contract.

| Resolver area | Queries retained                                                                                              | Mutations retained                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| App           | `sayHello`                                                                                                    | None                                                                                                                           |
| Member        | `checkAuth`, `checkAuthRoles`, `getMember`, `getAgents`, `getAllMembersByAdmin`                               | `signup`, `login`, `updateMember`, `likeTargetMember`, `updateMembersByAdmin`, `imageUploader`, `imagesUploader`               |
| Property      | `getProperty`, `getProperties`, `getFavorites`, `getVisited`, `getAgentProperties`, `getAllPropertiesByAdmin` | `createProperty`, `updateProperty`, `likeTargetProperty`, `updatePropertyByAdmin`, `removePropertyByAdmin`                     |
| Board article | `getBoardArticle`, `getBoardArticles`, `getAllBoardArticlesByAdmin`                                           | `createBoardArticle`, `updateBoardArticle`, `likeTargetBoardArticle`, `updateBoardArticleByAdmin`, `removeBoardArticleByAdmin` |
| Comment       | `getComments`                                                                                                 | `createComment`, `updateComment`, `removeCommentByAdmin`                                                                       |
| Follow        | `getMemberFollowings`, `getMemberFollowers`                                                                   | `subscribe`, `unsubscribe`                                                                                                     |
| Booking (new) | `getMyBookings`, `getHostBookings`                                                                            | `createBooking`, `confirmBooking`, `cancelBooking`, `createPayment`                                                            |

Source: [API components](../apps/kostay-api/src/components) and [app resolver](../apps/kostay-api/src/app.resolver.ts). Availability search, a property booked-dates query, and admin reservation lists are still proposed capabilities; their operation names, inputs, outputs, and error contracts remain undecided and unimplemented.

## UI terminology

| Before     | After                | Status / constraint                                                                       |
| ---------- | -------------------- | ----------------------------------------------------------------------------------------- |
| Nestar     | Kostay               | Branding substitution (Step 5)                                                            |
| Agent      | Host                 | Visible UI text only; the `AGENT` role, routes, files and operations keep their names     |
| Property   | Stay / accommodation | Visible UI text only ("Stays"); does not rename GraphQL Property                          |
| Sale price | Nightly rate         | Done in Step 3: `pricePerNight` displayed as `₩… / night` with one shared formatter       |
| Sold       | Paused / inactive    | `INACTIVE` means the host paused the listing; rented dates come from bookings, not status |
| Comment    | Comment              | Unchanged; a verified stay review is a separate future feature requiring booking data     |

Acceptance for each step: no contract or route regression, typecheck passing (or documented baseline failures), no UI promise of unsupported booking functionality, and a manual browser check with no GraphQL `errors` in the Network tab. See [decisions](DECISIONS.md).

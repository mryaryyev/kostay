# Next.js frontend migration plan

Status: planned, not implemented. No Next.js frontend source was inspected in this session. The backend currently uses Kostay branding while retaining Nestar domain contracts. The mappings below are conceptual, not claims about existing frontend filenames or routes.

## Step-by-step migration

1. Locate the actual frontend repository and read its instructions. Inventory Next.js version, App/Pages Router usage, route files, layouts, reusable components, GraphQL documents, generated types, endpoint configuration, and deployment references.
2. Record baseline lint, typecheck, build, and existing test results using that repository's scripts. Record current navigation and representative account/listing flows before editing.
3. Replace visible Nestar branding with Kostay in confirmed metadata, titles, navigation, footer, and project labels. Inspect assets before replacing them. Update package/deployment names only where they represent project identity; preserve endpoint addresses unless a deployment change is explicitly agreed.
4. Preserve GraphQL root field names, variables, input types, enum values, response handling, authentication headers, cache keys, and existing routes during branding. Client operation labels may stay unchanged. No generated contract changes are required merely for branding.
5. Validate navigation, listing/detail pages, login/signup, favorites, agent/admin access, uploads, and article/comment interactions where present. Check desktop/mobile layouts, metadata, and broken links. Run frontend lint/typecheck/build and available tests.
6. Inventory remaining real estate concepts and propose booking screens separately. Resolve inventory, host capabilities, date availability, pricing, confirmation, payments, and cancellation before specifying routes or contracts.
7. Once backend booking contracts are approved and implemented, update GraphQL documents/generated types and integrate booking UI in a separate phase. Reconcile redirects and compatibility with existing routes at that time.

## Conceptual page/component mappings

| Nestar concept (unverified frontend) | Branding phase destination | Future booking proposal |
|---|---|---|
| Home, site header, footer, metadata | Same pages/components with Kostay branding | Accommodation discovery after listing capabilities exist |
| Property list and filters | Same route and property contract | Date/guest-aware stay search |
| Property detail/card | Same data and price meaning | Stay detail/card with availability and nightly rate |
| Agent directory/profile | Keep existing role behavior and agent terminology | Host profiles after role/capability design |
| Agent property-management screen | Same CRUD and permissions | Host listing/calendar management |
| Favorites and visited listings | Same property references and operations | Saved accommodations after domain migration |
| Login/signup/profile | Same member/authentication contract | Guest/host onboarding if approved |
| Articles/comments/community | Same workflows | Separately decide retention and verified-review feature |
| Admin screens | Same permissions and operations | Reservation oversight only after backend support |
| No verified reservation screen | No addition in branding phase | Trips, booking detail, checkout/request flow; routes undecided |

## GraphQL query/mutation rename plan

**Branding-phase rename plan: none; every field below maps to itself.** Names were verified in backend resolvers, not in frontend documents. Do not rename `getAgents` to `getHosts`, or `createProperty` to a booking mutation, without a separately approved backend contract.

| Resolver area | Queries retained | Mutations retained |
|---|---|---|
| App | `sayHello` | None |
| Member | `checkAuth`, `checkAuthRoles`, `getMember`, `getAgents`, `getAllMembersByAdmin` | `signup`, `login`, `updateMember`, `likeTargetMember`, `updateMembersByAdmin`, `imageUploader`, `imagesUploader` |
| Property | `getProperty`, `getProperties`, `getFavorites`, `getVisited`, `getAgentProperties`, `getAllPropertiesByAdmin` | `createProperty`, `updateProperty`, `likeTargetProperty`, `updatePropertyByAdmin`, `removePropertyByAdmin` |
| Board article | `getBoardArticle`, `getBoardArticles`, `getAllBoardArticlesByAdmin` | `createBoardArticle`, `updateBoardArticle`, `likeTargetBoardArticle`, `updateBoardArticleByAdmin`, `removeBoardArticleByAdmin` |
| Comment | `getComments` | `createComment`, `updateComment`, `removeCommentByAdmin` |
| Follow | `getMemberFollowings`, `getMemberFollowers` | `subscribe`, `unsubscribe` |

Source: [API components](../apps/kostay-api/src/components) and [app resolver](../apps/kostay-api/src/app.resolver.ts). Availability search, booking quotes, reservation creation/cancellation, and guest/host reservation lists are proposed capabilities; their operation names, inputs, outputs, and error contracts remain undecided and unimplemented.

## UI terminology

| Before | After | Status / constraint |
|---|---|---|
| Nestar | Kostay | Safe branding substitution |
| Agent | Host | Future domain work; preserve AGENT authorization until redesigned |
| Property | Stay / accommodation | Proposed product vocabulary; does not rename GraphQL Property |
| Sale price | Nightly rate | Future pricing model; existing amounts must not simply be relabeled |
| Sold | Unavailable / archived | No approved equivalent; listing lifecycle differs from booked dates |
| Comment | Verified stay review | Separate feature requiring booking eligibility, not a label-only replacement |

Acceptance for the branding phase: verified brand changes, no contract/route regression, passing available checks or clearly documented baseline failures, and no UI promise of unsupported booking functionality. See [decisions](DECISIONS.md).

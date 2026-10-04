---
name: backend-migration
description: Continue the Kostay backend migration from Nestar property concepts to Kostay booking-platform property concepts while preserving the existing NestJS architecture.
---

# Kostay Backend Migration

Use this skill when changing backend code for the Kostay booking-platform migration.

## Workflow

1. Search for affected property/booking references before editing.
2. Preserve the resolver/service/module structure already used by `kostay-api`.
3. Keep DTOs, enums, and schemas in their existing folders.
4. Keep `MemberType.USER | AGENT | ADMIN` unchanged.
5. Use property/booking terminology for catalog behavior and database lookups.
6. Update social modules consistently when property counters, likes, views, comments, or notifications are involved.
7. Update batch logic when property ranking or `memberProperties` affects rank calculations.
8. Update `docs/ai/COMPLETED_TASKS.md` after major completed work.

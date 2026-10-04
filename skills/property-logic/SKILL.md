---
name: property-logic
description: Review Kostay property API consistency across GraphQL operations, DTOs, schemas, enums, filters, and remaining legacy terminology.
---

# Kostay Property API Review

Use this skill for review-only passes or pre-edit analysis of the property API.

## Review Checklist

- Confirm GraphQL operation names use property terminology:
  - `createProperty`
  - `getProperty`
  - and where it is related
- Confirm shared operations such as `getFavorites` and `getVisited` return property data.
- Confirm DTOs, schemas, and enums agree on property fields and nullability.
- Confirm filters use property type, location, price per night, guests and etc.
- Report real findings with paths and behavior impact.
 
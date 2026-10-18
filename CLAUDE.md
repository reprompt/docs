# Reprompt documentation

This is a Next.js App Router site using Fumadocs and MDX. Read `DEVELOPMENT.md` for setup, content editing, validation, and Vercel deployment.

- Use Node 22 and `npm ci`.
- `npm run dev` generates API pages and starts the local site.
- `npm run build` generates and builds from committed OpenAPI snapshots. No API credentials or remote schema fetches are needed.
- Authored pages live in `content/docs`; navigation lives in each folder's `meta.json`.
- `content/docs/api-reference`, `.source`, and `public/openapi*.json` are generated; do not edit them.
- `lib/api-routes.ts` defines stable API URLs. Every new operation needs an explicit mapping.
- `npm run sync:openapi` explicitly refreshes V2. Review its diff before committing.
- Public assets live in `public`; reusable MDX lives in `snippets`.
- Validate with `npm run check`, `npm test`, `npm run typecheck`, and `npm run build`.
- Run `npm run test:smoke` against a running production server.
- Browser-test desktop/mobile, search, code tabs, schemas, and the playground. Mock API responses for tests; do not run billable API requests as a build check.

The source contains unpublished legacy files outside `content/docs`. Do not publish `guides/tripadvisor-category.mdx` without implementing authorization. `guides/entrances.mdx` and `changelog.mdx` are also excluded.

Do not restore the retired KYB API or V2 `/find-places`, `/placematch`, or `/validate` operations. The V1 refresh-batches operation is withheld because its committed specification references missing schemas. Preserve its redirect to the monthly-refresh guide until the API contract is verified.

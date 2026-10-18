# Reprompt docs

The replacement for Mintlify uses Next.js, Fumadocs, MDX, and Fumadocs OpenAPI. It builds from this repository and runs on Vercel. It needs no CMS, search service, database, API key, or Mintlify account.

## Local development

```sh
nvm use
npm ci
npm run dev
```

Open http://localhost:3000. The homepage redirects to `/guides/quickstart`.

For a production check:

```sh
npm run build
npm start
# In another terminal:
npm run test:smoke
```

## Editing

- Edit guides in `content/docs/guides` and schema documentation in `content/docs/schemas`.
- Add new pages to the neighboring `meta.json` navigation list.
- Keep images in `public/images`; reference them with `/images/...`.
- Reusable MDX imports use `@/snippets/...`.
- `components/mdx.tsx` supports existing callouts, steps, badges, accordions, frames, and examples. Code groups require explicit `titles={["cURL", "Python", "JavaScript"]}`.
- Layout and brand settings live in `lib/layout.tsx` and `app/global.css`.
- Redirects live in `lib/redirects.mjs`.

`npm run generate` rebuilds API MDX, downloadable specifications, `llms.txt`, and the route inventory. Generated files are ignored by Git. Both `dev` and `build` run generation automatically. Restart the dev server after changing OpenAPI snapshots.

## API reference

All three specifications are committed snapshots. Normal builds never fetch from production. Refresh V2 explicitly with `npm run sync:openapi`, review the diff, and commit it. Update the V1 and Search/Ask snapshots from an authoritative source when their contracts change. Add stable URL mappings in `lib/api-routes.ts` for new operations; generation fails on unknown operations or unresolved schema references.

The browser playground sends requests directly to the API. Users supply their own key and, for V1, their organization slug. The API must allow CORS from the docs origin. There is no unrestricted proxy and no server-side API credential. Playground settings (including entered authorization values) use the upstream Fumadocs browser storage behavior; avoid shared-browser credentials. Test submissions with intercepted responses, not production jobs.

The V1 snapshot references missing `BulkRefreshBatchRequest` and `BulkRefreshBatchResponse` schemas. Only that refresh operation is omitted from the published copy; the original snapshot is preserved. Its previous URL redirects to `/guides/monthly-refresh`. Restore it only after obtaining a complete contract.

## Publication scope

33 pages: 10 guides, one schema guide, an API index, and 21 generated API operation pages. Existing guide URLs and API operation slugs remain stable, including the Search & Answers ampersand URLs. Search is a statically built local index. The sitemap, robots file, OpenAPI downloads, and `llms.txt` contain public content only.

Intentionally omitted: Mintlify AI chat, hosted editor, organization authentication, and exact theme parity. The Tripadvisor guide stays outside `content/docs` until authorization exists. Previously unlisted entrances/changelog pages remain unpublished. Retired KYB and V2 find-places/placematch/validate APIs stay excluded.

The migration preserves existing API examples. Some legacy guide response shapes differ from the committed V1 schema; resolving API contract discrepancies is a separate content review.

## Validation

```sh
npm run generate
npm run check
npm test
npm run typecheck
npm run build
```

`check` validates internal links/assets, route coverage, exclusions, and schema references. Unit tests cover encoded legacy routes and schema/URL contracts. `test:smoke` checks all public pages, redirects, forbidden routes, search, and discovery endpoints against a running server. Override its target with `DOCS_TEST_URL`. The Docs validation GitHub Action runs without production API credentials. The separate existing Claude Auto Review workflow runs examples with its configured secrets on non-draft PRs; it skips drafts.

For a protected preview in the linked Vercel project, run `DOCS_TEST_URL=https://your-preview.vercel.app vercel env run -- npm run test:smoke`. This uses a short-lived OIDC token without saving it and never forwards that token through redirects.

Before releasing, compare the Mintlify and replacement pages in a browser: quickstart, a screenshot-heavy guide, a V1 reference page, Search/Ask, and V2. Check mobile navigation, both themes, language tabs and copy, search results, nested schemas, and mocked playground success/error responses.

## Vercel and cutover

1. Import the repository as a Next.js project, Node 22, `npm ci`, `npm run build`. No environment variables are required. Keep the production docs domain on Mintlify during review.
2. Create a preview deployment from the migration branch. Test it using the checks above. `.vercelignore` excludes local datasets, experimental scripts, unpublished guides, and environment files from CLI uploads.
3. After accepting the preview, deploy production, attach `docs.repromptai.com`, and apply the DNS records Vercel provides. Verify redirects, canonical URLs, assets, and API CORS on that origin.
4. Keep the old Mintlify deployment available through cutover. If needed, restore the prior domain/DNS mapping. Do not cancel Mintlify until production passes verification.

Do not push this migration directly to the Mintlify-connected main branch before coordinating cutover: the content and assets have moved. The previous Mintlify configuration remains in `docs.json` for migration comparison only; the Next.js build does not read it.

The migration review project is `reprompt-ai/reprompt-docs`. Its verified deployment is https://reprompt-docs-bfa46q1tw-reprompt-ai.vercel.app. The live docs domain has not been attached or moved. Local production and remote preview builds passed all 33 page checks, seven redirects, exclusions, and discovery endpoints; browser checks covered responsive layouts, search, code tabs/copy, nested schemas, organization variables, and mocked playground success/error responses.

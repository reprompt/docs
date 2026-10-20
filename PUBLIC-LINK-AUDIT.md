# Public docs migration audit — 2026-10-20

An anonymous HTTP crawl started at https://docs.repromptai.com/, its sitemap,
robots.txt, llms.txt and llms-full.txt. No cookies or account credentials were used.
The crawl recursively followed same-origin HTML links, image sources and Markdown
links. Mintlify/Next.js implementation assets (`/_next/`, `/_mintlify/`, `/cdn-cgi/`)
and third-party hosts were excluded; the replacement supplies its own runtime.

## Results

- 1,149 internal link references followed (including repeated navigation links).
- 75 distinct URLs discovered: 72 returned HTTP 200, three returned 404.
- Every one of the 72 working source URLs resolves successfully on the new site.
- `lib/public-crawl-contract.json` records all 72 URLs and linked legacy fragments.
  CI verifies them against a running production build.
- The earlier inventory additionally covers public unlisted pages and 36 original
  image/logo URLs that are not all discoverable from the home page.

## Mapping differences

| Old URL or fragment | Replacement behavior |
| --- | --- |
| `/api-reference/batches/mark-batches-for-refresh` | Redirect to `/guides/monthly-refresh`; incomplete operation is not regenerated |
| `/guides/tripadvisor-category` | Redirect to `/schemas/schemas`; organization-restricted source content remains excluded |
| `/guides/entrances`, `/changelog` | Available at the same URL, outside primary navigation |
| `*.md`, `/llms-full.txt` | Generated at build time |
| Authored heading fragments | Original IDs retained, including punctuation and duplicate heading numbering |
| API parameter fragments | Exact field where available, otherwise the corresponding API section |
| API body/response fragments | Corresponding request/response section, rather than the old expandable field |
| API fragments on retired-page redirects | Replacement guide title |

The following links were already broken on the source site. The replacement
handles all three, including their Markdown variants:

- `/api-reference/attributes/get-enrichment-attributes` → `/api-reference/attributes/get-all-available-attributes`
- `/guides/place-enrichment` → `/guides/quickstart`
- `/guides/geofencing` → `/guides/batch-processing` (related guide fallback, not a dedicated geofencing guide)

## Validation

`npm run check` verifies the legacy inventory locally. `npm run test:smoke` checks
URLs, redirect destinations, Markdown endpoints, legacy heading IDs, assets, and
the public crawl contract over HTTP. The default target is localhost:3000; set
`DOCS_TEST_URL` to check a deployment.

The custom domain remains on Mintlify until the migration/domain handoff. This
report concerns compatibility of the replacement, not a completed domain cutover.

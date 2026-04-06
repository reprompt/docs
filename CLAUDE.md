# CLAUDE.md

This is the **Reprompt API documentation site**, built with [Mintlify](https://mintlify.com). It documents a geospatial API platform providing place enrichment and batch processing capabilities.

**Live site:** https://docs.repromptai.com
**Auto-deploys** on push to `main`.

## Quick Reference

```bash
npm install          # Install deps for React components
mintlify dev         # Start local dev server at http://localhost:3000
```

## Repository Layout

```
docs.json              # Mintlify config: navigation, theme, API playground settings
openapi-v1.json        # V1 OpenAPI spec (stable) — committed, auto-rendered by Mintlify
openapi-v2.json        # V2 OpenAPI spec (experimental) — fetched live from production
guides/*.mdx           # Documentation pages (quickstart, batch, CSV upload, etc.)
schemas/               # Shared schema documentation
snippets/              # React components and reusable MDX snippets
images/                # Screenshots and static assets
logo/                  # Brand logos (light/dark)
changelog.mdx          # API changelog
```

## Common Tasks

### Adding a new documentation page
1. Create `guides/my-page.mdx` with required frontmatter:
   ```mdx
   ---
   title: "Page Title"
   description: "Page description"
   ---
   ```
2. Add the page path to `docs.json` under the appropriate version/group in `navigation.versions`.
3. Push to `main` — Mintlify auto-deploys.

### Adding a React component
- Place `.jsx` files in `/snippets`.
- Import in MDX: `import { MyComponent } from "/snippets/MyComponent.jsx"`
- Use `<MyComponent />` in the page body.

### Updating OpenAPI specs

**V1** (requires API key):
```bash
curl "https://api.repromptai.com/v1/reprompt/openapi.json" \
  -H "Authorization: Bearer $REPROMPT_API_KEY" > openapi-v1.json
```

**V2** (no auth):
```bash
curl "https://api.repromptai.com/v2/openapi.json" > openapi-v2.json
```

After updating any spec: commit, push to `main`, and it auto-deploys.

Note: The V2 spec in `docs.json` is configured to fetch live from `https://api.reprompt.io/v2/openapi.json`, so the committed `openapi-v2.json` is a local reference copy. V1 uses the committed file directly.

## Navigation Structure (`docs.json`)

The site uses versioned navigation with three sections:
- **v1** — Stable API: quickstart, enrichment API reference (from `openapi-v1.json`), guides
- **v2 experimental** — Experimental API: V2 API reference (fetched live), guides

Pages are referenced by path without extension (e.g., `"guides/quickstart"`).

## Key Patterns

- All `.mdx` files require `title` and `description` frontmatter
- OpenAPI specs are auto-rendered by Mintlify — just reference them in `docs.json`
- API playground is set to `"interactive"` mode
- Theme: "aspen", primary color: `#5046e5`
- Mapbox token is embedded in playground components — do not share publicly without replacing

## Removed from docs

The following have been disabled in the backend and removed from documentation:
- `/v2/find-places` — Search/discover places
- `/v2/placematch` — Match places across data sources
- `/v2/validate` — Validate place data
- KYB API — Know Your Business verification (entire version section removed)

Do not re-add documentation for these.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Reprompt API documentation site, built with Mintlify. It documents a geospatial API platform that provides place enrichment capabilities across multiple data sources.

## Development Commands

### Local Development
```bash
# Install dependencies for React components
npm install

# Start Mintlify dev server
mintlify dev

# Test with specific organization context
mintlify dev --groups org:reprompt
```

The docs will be available at `http://localhost:3000`.

### Updating OpenAPI Spec

**V2 Spec (auto-fetch from production):**
```bash
# Pull latest V2 spec from production
curl "https://api.repromptai.com/v2/openapi.json" > openapi-v2.json

# Commit and push (Mintlify auto-deploys on push to main)
git add openapi-v2.json
git commit -m "Update V2 OpenAPI spec from production"
git push
```

**V1 Spec (maintained locally):**
The V1 OpenAPI spec (`openapi-v1.json`) is maintained manually in this repository. Unlike V2, there is no public endpoint to fetch the V1 spec automatically. Updates to V1 spec must be made directly to the `openapi-v1.json` file.

## Repository Structure

### Documentation Content
- **guides/**: API guides including quickstart, batch processing, placematch, open-closed status, and TripAdvisor categories
- **schemas/**: Shared schema documentation
- **changelog.mdx**: API changelog

### OpenAPI Specifications
- **openapi-v2.json**: V2 API specification (~42KB) - Current experimental version
- **openapi-v1.json**: V1 API specification (~32KB) - Stable version

### Custom Components
- **snippets/PlacematchPlayground.tsx**: Interactive React component for testing Placematch API
  - Uses Mapbox GL JS for map visualization
  - Displays match results, confidence scores, and API request/response
  - Sample scenarios: name-only search, international addresses, BYOD matching
  - Hardcoded Mapbox token (public read-only): `pk.eyJ1IjoicmVwcm9tcHQiLCJhIjoiY20yMWdseDYzMDB4djJrczF5dXZycjdlaiJ9.lCIzH2Ol77ODbvOpyXmJOA`
- **snippets/PlacematchPlayground.jsx**: JavaScript version of the same component

### Configuration
- **docs.json**: Main Mintlify configuration used for both local development and production deployment
  - Uses versioned navigation format with V1 and V2 API references
  - V2 fetches OpenAPI spec directly from production: `https://api.reprompt.io/v2/openapi.json`
  - Automatically deployed when pushed to main branch
  - Theme: "aspen", Primary color: #5046e5
  - API playground mode: "interactive"

## API Architecture

The Reprompt API provides place enrichment and matching capabilities. The API documentation includes both V1 (stable) and V2 (experimental) versions.

### Key Endpoints
- **Place Enrichment**: Core enrichment API for adding attributes to place data
- **Batch Processing**: Asynchronous processing for large datasets
- **Placematch**: Match places across different data sources

Refer to the OpenAPI specifications (`openapi-v1.json` and `openapi-v2.json`) for detailed endpoint documentation.

## Important Patterns

### MDX File Structure
All `.mdx` files require frontmatter:
```mdx
---
title: "Page Title"
description: "Page description"
---
```

### Custom Component Import
```mdx
import { ComponentName } from "/snippets/ComponentName.tsx"

<ComponentName />
```

### OpenAPI Integration
API documentation references OpenAPI specs defined in `docs.json` navigation structure. The specs are automatically rendered by Mintlify. V2 API spec is fetched dynamically from production at `https://api.reprompt.io/v2/openapi.json`.

### Interactive Playground Component
The PlacematchPlayground component in `/snippets`:
- Makes real-time API calls to demonstrate Placematch functionality
- Uses Mapbox GL JS for GeoJSON visualization on interactive maps
- Includes multiple sample scenarios and input modes
- Displays confidence scores (VERY_HIGH, HIGH, MEDIUM, LOW) with reasoning
- Supports BYOD (bring-your-own-data) matching with candidate arrays
- Built with React 18 and TypeScript, styled with Tailwind CSS

## Development Notes

### When Adding New Documentation
1. Create `.mdx` file in appropriate directory
2. Add required frontmatter (title, description)
3. Update `docs.json` navigation if adding new pages
4. For API endpoints, reference OpenAPI spec or use inline API documentation

### When Working with Custom Components
- React components live in `/snippets` directory
- Use TypeScript with proper type definitions (`.tsx` extension)
- Maintain both `.tsx` and `.jsx` versions for compatibility
- Import Mapbox GL CSS when using maps: `import 'mapbox-gl/dist/mapbox-gl.css'`
- Follow existing patterns in PlacematchPlayground.tsx
- Dependencies: React 18, Mapbox GL 3.0, TypeScript 5.0

## Dependencies

```json
{
  "dependencies": {
    "mapbox-gl": "^3.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "playwright": "^1.56.0",
    "typescript": "^5.0.0"
  }
}
```

Playwright is included as a dev dependency for potential browser automation/testing.

## Building Interactive Playgrounds

When creating interactive API playgrounds in Mintlify, import components from `@mintlify/components` such as `Tip` and `CodeBlock` for consistent styling. Use `CodeBlock` with a `language` prop and pass a `<code>` element as children to render syntax-highlighted responses. Implement API key injection by using `useEffect` to query and update DOM code blocks with `document.querySelectorAll('code')` when the API key changes. Always use Mapbox's `satellite-streets-v12` style for consistent map appearance regardless of theme. Disable interactive buttons when required inputs (like API keys) are missing to prevent error states. Display dynamic API responses by rendering the actual JSON from successful requests, limiting to the first 3 results for readability.

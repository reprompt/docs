import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { redirects } from '../lib/redirects.mjs';

const base = process.env.DOCS_TEST_URL ?? 'http://localhost:3000';
// `vercel env run` supplies a short-lived token for protected previews. Keep it
// on the configured origin: never follow redirects with an authorization header.
function fetchPage(path: string) {
  const headers: Record<string, string> = {};
  if (process.env.VERCEL_OIDC_TOKEN && new URL(base).hostname.endsWith('.vercel.app')) {
    headers['x-vercel-trusted-oidc-idp-token'] = process.env.VERCEL_OIDC_TOKEN;
  }
  return fetch(`${base}${path}`, { redirect: 'manual', headers });
}
const pages = JSON.parse(await readFile('public/docs-manifest.json', 'utf8')) as { slug: string; title: string }[];
for (const page of pages) {
  const response = await fetchPage(`/${page.slug}`);
  const html = await response.text();
  assert.equal(response.status, 200, page.slug);
  assert.ok(html.includes('<h1'), `Missing page heading: ${page.slug}`);
  assert.ok(!html.includes('data-next-error-digest'), `Rendering error: ${page.slug}`);
  assert.ok(html.includes('id="nd-page"'), `Missing documentation content: ${page.slug}`);
  if (page.slug === 'api-reference/search-&-answers/search-the-web') {
    assert.ok(html.includes('Returns a stable, normalized list of web search results.'), 'Missing API description');
  }
}
for (const { source, destination, permanent } of redirects) {
  const response = await fetchPage(source);
  assert.equal(response.status, permanent ? 308 : 307, source);
  assert.equal(new URL(response.headers.get('location')!, base).pathname, destination, source);
}
for (const path of ['/missing-page', '/guides/tripadvisor-category', '/guides/entrances', '/changelog', '/api-reference/enrichments/find-places', '/api-reference/enrichments/placematch', '/api-reference/enrichments/validate']) {
  const response = await fetchPage(path);
  assert.equal(response.status, 404, path);
}
const encodedSearch = await fetchPage('/api-reference/search-%26-answers/search-the-web');
assert.equal(encodedSearch.status, 200, 'Encoded legacy search URL');
for (const path of ['/api/search', '/sitemap.xml', '/robots.txt', '/llms.txt', '/openapi-v1.json', '/openapi-search-ask-v1.json', '/openapi-v2.json']) {
  const response = await fetchPage(path);
  assert.equal(response.status, 200, path);
  const text = await response.text();
  assert.ok(text.length > 20, `Empty discovery endpoint: ${path}`);
  assert.ok(!text.includes('tripadvisor-category'), `Restricted page in ${path}`);
}
console.log(`HTTP smoke checks passed: ${pages.length} pages, ${redirects.length} redirects, exclusions, encoded URLs, search, and discovery endpoints.`);

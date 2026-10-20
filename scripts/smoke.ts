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
const legacyAnchors: Record<string, string[]> = JSON.parse(await readFile('lib/legacy-heading-anchors.json', 'utf8'));
for (const page of pages) {
  const response = await fetchPage(`/${page.slug}`);
  const html = await response.text();
  assert.equal(response.status, 200, page.slug);
  const decodedHtml = html.replaceAll('&amp;', '&').replaceAll('&quot;', '"');
  for (const anchor of legacyAnchors[`/${page.slug}`] ?? []) {
    assert.ok(decodedHtml.includes(`id="${anchor}"`), `Legacy heading missing: ${page.slug}#${anchor}`);
  }
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
for (const path of ['/missing-page', '/api-reference/enrichments/find-places', '/api-reference/enrichments/placematch', '/api-reference/enrichments/validate']) {
  const response = await fetchPage(path);
  assert.equal(response.status, 404, path);
}
const encodedSearch = await fetchPage('/api-reference/search-%26-answers/search-the-web');
assert.equal(encodedSearch.status, 200, 'Encoded legacy search URL');
for (const path of ['/api/search', '/sitemap.xml', '/robots.txt', '/llms.txt', '/llms-full.txt', '/guides/quickstart.md', '/openapi-v1.json', '/openapi-search-ask-v1.json', '/openapi-v2.json']) {
  const response = await fetchPage(path);
  assert.equal(response.status, 200, path);
  const text = await response.text();
  assert.ok(text.length > 20, `Empty discovery endpoint: ${path}`);
  assert.ok(!text.includes('tripadvisor-category'), `Restricted page in ${path}`);
  if (path === '/sitemap.xml') {
    assert.ok(!/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);)/i.test(text), 'Unescaped ampersand in sitemap XML');
    assert.ok(text.includes('/search-%26-answers/search-the-web'), 'Missing encoded legacy sitemap URL');
    assert.equal((text.match(/<loc>/g) ?? []).length, pages.length, 'Sitemap page coverage');
  }
}
console.log(`HTTP smoke checks passed: ${pages.length} pages, ${redirects.length} redirects, exclusions, encoded URLs, search, and discovery endpoints.`);

const legacyUrls: string[] = JSON.parse(await readFile('lib/legacy-public-urls.json', 'utf8'));
for (const path of legacyUrls) {
  for (const suffix of ['', '.md']) {
    const url = path + suffix;
    const response = await fetchPage(url);
    const redirect = redirects.find((entry) => entry.source === url);
    // HTML redirects also need equivalent Markdown destinations.
    assert.equal(response.status, redirect ? (redirect.permanent ? 308 : 307) : 200, `Legacy URL: ${url}`);
    if (redirect) assert.equal((await fetchPage(redirect.destination)).status, 200, `Legacy redirect destination: ${url}`);
  }
}
console.log(`Legacy compatibility passed: ${legacyUrls.length} HTML URLs and their Markdown equivalents.`);
const legacyAssets: string[] = JSON.parse(await readFile('lib/legacy-public-assets.json', 'utf8'));
for (const asset of legacyAssets) assert.equal((await fetchPage(encodeURI(asset))).status, 200, `Legacy asset: ${asset}`);
console.log(`Legacy assets passed: ${legacyAssets.length} image and logo URLs.`);

// Anonymous crawl from the live root, sitemap and llms.txt, captured 2026-10-20.
const { legacyAnchorTarget } = await import('../lib/legacy-anchors');
const crawlContract: Record<string, string[]> = JSON.parse(await readFile('lib/public-crawl-contract.json', 'utf8'));
await Promise.all(Object.entries(crawlContract).map(async ([path, anchors]) => {
  let response = await fetchPage(path);
  if ([307, 308].includes(response.status)) response = await fetchPage(new URL(response.headers.get('location')!, base).pathname);
  assert.equal(response.status, 200, `Public crawl URL: ${path}`);
  if (!anchors.length) return;
  const html = (await response.text()).replaceAll('&amp;', '&');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  for (const anchor of anchors) assert.ok(legacyAnchorTarget(anchor, (id) => ids.has(id)), `Unmapped public fragment: ${path}#${anchor}`);
}));
console.log(`Public crawl contract passed: ${Object.keys(crawlContract).length} discovered URLs and their linked fragments.`);

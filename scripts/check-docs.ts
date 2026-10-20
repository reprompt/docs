import assert from 'node:assert/strict';
import { access, glob, readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import { apiRoutes } from '../lib/api-routes';
import { readSpec } from '../lib/specs';
import { redirects } from '../lib/redirects.mjs';

const pages = JSON.parse(await readFile('public/docs-manifest.json', 'utf8')) as { slug: string; title: string }[];
const routes = new Set(pages.map((page) => `/${page.slug}`));
assert.equal(routes.size, pages.length, 'Duplicate public URLs');
assert.equal(apiRoutes.length, 21, 'Review the API route inventory when changing scope');
for (const [id, method, path, slug] of apiRoutes) {
  assert.ok(readSpec(id).paths?.[path]?.[method], `Missing API operation: ${id} ${method} ${path}`);
  assert.ok(routes.has(`/api-reference/${slug}`), `Missing generated page: ${slug}`);
}
for (const redirect of redirects) assert.ok(routes.has(redirect.destination.replace(/\.md$/, '')), `Broken redirect: ${redirect.source}`);
const excluded = ['tripadvisor-category', 'kyb', 'find-places', 'placematch', '/validate'];
for (const route of routes) for (const name of excluded) assert.ok(!route.includes(name), `Excluded route published: ${route}`);
const problems: string[] = [];
for await (const file of glob('**/*.mdx', { cwd: 'content/docs' })) {
  const raw = await readFile(`content/docs/${file}`, 'utf8');
  const { data, content } = matter(raw);
  assert.ok(data.title, `Missing title: ${file}`);
  assert.ok(!data.groups, `Restricted content must not be published: ${file}`);
  // Ignore example code; inspect authored Markdown links and JSX asset URLs.
  const prose = content.replace(/```[\s\S]*?```/g, '');
  const urls = [...prose.matchAll(/\]\((\/[^)]+)\)|(?:href|src)=["'](\/[^"']+)["']/g)].map((match) => match[1] ?? match[2]);
  for (const url of urls) {
    const pathname = decodeURIComponent(url.split(/[?#]/)[0]);
    if (routes.has(pathname) || redirects.some((redirect) => redirect.source === pathname)) continue;
    try { await access(`public${pathname}`); }
    catch { problems.push(`${file}: ${url}`); }
  }
}
assert.deepEqual(problems, [], 'Broken internal links or assets');
console.log(`Checked ${pages.length} pages, ${apiRoutes.length} API operations, redirects, exclusions, and local links/assets.`);

// Snapshot of the public Mintlify sitemap and public unlisted pages (2026-10-20).
const legacyUrls: string[] = JSON.parse(await readFile('lib/legacy-public-urls.json', 'utf8'));
for (const url of legacyUrls) {
  assert.ok(routes.has(url) || redirects.some((redirect) => redirect.source === url), `Legacy public URL lost: ${url}`);
}
const legacyAssets: string[] = JSON.parse(await readFile('lib/legacy-public-assets.json', 'utf8'));
for (const asset of legacyAssets) await access(`public${asset}`);

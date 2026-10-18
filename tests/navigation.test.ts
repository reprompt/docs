import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { flattenTree } from 'fumadocs-core/page-tree';
import { createVersionNavigation, navigationVersion } from '../lib/navigation';

test('version navigation exposes every published page', () => {
  const pages = JSON.parse(readFileSync('public/docs-manifest.json', 'utf8')) as { slug: string; title: string }[];
  const versions = createVersionNavigation({ name: 'Docs', children: pages.map(({ slug, title }) => ({ type: 'page', name: title, url: `/${slug}` })) });
  assert.deepEqual(new Set(flattenTree(versions).map((page) => page.url)), new Set(pages.map((page) => `/${page.slug}`)));
});

test('shared troubleshooting keeps its version while cross-version links switch', () => {
  assert.equal(navigationVersion('/guides/troubleshooting-40x', 'v2'), 'v2');
  assert.equal(navigationVersion('/guides/troubleshooting-40x', 'v1'), 'v1');
  assert.equal(navigationVersion('/api-reference/enrichments/enrich', 'v1'), 'v2');
  assert.equal(navigationVersion('/guides/agents-in-api', 'v1'), 'v2');
  assert.equal(navigationVersion('/guides/quickstart', 'v2'), 'v1');
});

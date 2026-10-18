import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apiRoutes, getApiSlug } from '../lib/api-routes';
import { assertLocalReferences, readSpec } from '../lib/specs';
import { normalizeSlugs } from '../lib/routes';

test('legacy ampersand URLs resolve with raw and encoded Next params', () => {
  const expected = ['api-reference', 'search-&-answers', 'search-the-web'];
  assert.deepEqual(normalizeSlugs(expected), expected);
  assert.deepEqual(normalizeSlugs(['api-reference', 'search-%26-answers', 'search-the-web']), expected);
  assert.equal(normalizeSlugs(undefined), undefined);
  assert.deepEqual(normalizeSlugs(['bad%']), ['bad%']);
});

test('all published OpenAPI operations have stable, unique public URLs', () => {
  const paths = new Set<string>();
  for (const id of ['v1', 'search', 'v2'] as const) {
    const spec = readSpec(id);
    for (const [path, item] of Object.entries(spec.paths ?? {})) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']) {
        if (!item || !(method in item)) continue;
        const slug = getApiSlug(id, method, path);
        assert.ok(!paths.has(slug), `Duplicate slug: ${slug}`);
        paths.add(slug);
      }
    }
  }
  assert.equal(paths.size, apiRoutes.length);
  assert.throws(() => getApiSlug('v2', 'post', '/new-endpoint'), /Unmapped API operation/);
});

test('published schemas resolve locally and omit retired/incomplete endpoints', () => {
  for (const id of ['v1', 'search', 'v2'] as const) assertLocalReferences(readSpec(id));
  assert.ok(!readSpec('v1').paths?.['/place_enrichment/batches/refresh']);
  assert.deepEqual(Object.keys(readSpec('v2').paths ?? {}).sort(), ['/attributes', '/enrich']);
  assert.throws(() => assertLocalReferences({ $ref: '#/missing' }), /Unresolved/);
  assert.throws(() => assertLocalReferences({ $ref: 'https://example.com/schema' }), /External/);
});

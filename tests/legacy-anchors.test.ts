import assert from 'node:assert/strict';
import test from 'node:test';
import { legacyAnchorTarget } from '../lib/legacy-anchors';

test('legacy path parameters resolve to their own field before query sections', () => {
  const ids = new Set(['parameters.path.batch_id', 'parameters-query', 'page-title']);
  assert.equal(legacyAnchorTarget('parameter-batch-id', (id) => ids.has(id)), 'parameters.path.batch_id');
});
test('retired API links fall back to the replacement guide title', () => {
  assert.equal(legacyAnchorTarget('authorization-authorization', (id) => id === 'page-title'), 'page-title');
  assert.equal(legacyAnchorTarget('unknown-fragment', (id) => id === 'page-title'), undefined);
});

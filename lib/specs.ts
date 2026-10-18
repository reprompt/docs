import type { Document } from 'fumadocs-openapi';
import type { SpecId } from './api-routes';
import v1 from '../openapi-v1.json';
import search from '../openapi-search-ask-v1.json';
import v2 from '../openapi-v2.json';

export const specFiles: Record<SpecId, string> = {
  v1: 'openapi-v1.json', search: 'openapi-search-ask-v1.json', v2: 'openapi-v2.json',
};

export function assertLocalReferences(document: unknown): void {
  function visit(value: unknown) {
    if (!value || typeof value !== 'object') return;
    if ('$ref' in value && typeof value.$ref === 'string') {
      const ref = value.$ref;
      if (!ref.startsWith('#/')) throw new Error(`External schema reference is not allowed: ${ref}`);
      let target: unknown = document;
      for (const part of ref.slice(2).split('/')) {
        target = target && typeof target === 'object' ? (target as Record<string, unknown>)[part.replaceAll('~1', '/').replaceAll('~0', '~')] : undefined;
      }
      if (target === undefined) throw new Error(`Unresolved schema reference: ${ref}`);
    }
    Object.values(value).forEach(visit);
  }
  visit(document);
}

export function readSpec(id: SpecId): Document {
  // Explicit imports prevent Next from tracing unrelated repository files.
  const document = structuredClone({ v1, search, v2 }[id]) as unknown as Document;
  if (id === 'v1') {
    // The upstream snapshot references two missing BulkRefreshBatch schemas.
    // Keep the source intact; withhold this operation until its contract is verified.
    if (document.paths) delete document.paths['/place_enrichment/batches/refresh'];
  }
  if (id === 'v2') {
    for (const path of ['/find-places', '/placematch', '/validate']) {
      if (document.paths?.[path]) throw new Error(`Retired endpoint in V2 snapshot: ${path}. Run npm run sync:openapi.`);
    }
  }
  assertLocalReferences(document);
  return document;
}

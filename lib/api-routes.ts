// Existing Mintlify URLs are an explicit contract; titles can change without breaking links.
export const apiRoutes = [
  ['v1', 'post', '/place_enrichment/enrich', 'enrich-a-single-place-synchronously'],
  ['v1', 'get', '/place_enrichment/jobs', 'jobs/get-enrichment-jobs'],
  ['v1', 'post', '/place_enrichment/jobs', 'jobs/submit-a-single-enrichment-job'],
  ['v1', 'get', '/place_enrichment/jobs/{place_id}', 'jobs/get-a-single-enrichment-job'],
  ['v1', 'delete', '/place_enrichment/jobs/{place_id}', 'jobs/delete-a-job'],
  ['v1', 'post', '/place_enrichment/jobs/reprocess', 'jobs/reprocess-jobs'],
  ['v1', 'get', '/place_enrichment/batches', 'batches/list-batches'],
  ['v1', 'post', '/place_enrichment/batches', 'batches/submit-a-batch-of-places-for-enrichment'],
  ['v1', 'get', '/place_enrichment/batches/{batch_id}', 'batches/get-batch-status'],
  ['v1', 'put', '/place_enrichment/batches/{batch_id}', 'batches/rename-or-update-a-batch'],
  ['v1', 'delete', '/place_enrichment/batches/{batch_id}', 'batches/delete-a-batch'],
  ['v1', 'post', '/place_enrichment/batches/{batch_id}/reprocess', 'batches/reprocess-a-batch'],
  ['v1', 'get', '/place_enrichment/exports', 'exports/list-durable-exports'],
  ['v1', 'post', '/place_enrichment/exports', 'exports/create-a-csv-export'],
  ['v1', 'get', '/place_enrichment/exports/{export_id}', 'exports/get-export-status'],
  ['v1', 'get', '/place_enrichment/exports/{export_id}/download', 'exports/download-a-completed-export'],
  ['v1', 'get', '/place_enrichment/attributes', 'attributes/get-all-available-attributes'],
  ['search', 'post', '/search', 'search-&-answers/search-the-web'],
  ['search', 'post', '/ask', 'search-&-answers/get-a-fast-source-backed-answer'],
  ['v2', 'post', '/enrich', 'enrichments/enrich'],
  ['v2', 'get', '/attributes', 'enrichments/list-attributes'],
] as const;

export type SpecId = typeof apiRoutes[number][0];

export function getApiSlug(spec: string, method: string, path: string): string {
  const route = apiRoutes.find(([id, verb, endpoint]) => id === spec && verb === method && endpoint === path);
  if (!route) throw new Error(`Unmapped API operation: ${spec} ${method.toUpperCase()} ${path}. Add its public URL to lib/api-routes.ts.`);
  return route[3];
}

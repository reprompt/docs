/** Resolve old Mintlify fragments to the closest available Fumadocs field/section. */
export function legacyAnchorTarget(hash: string, exists: (id: string) => boolean): string | undefined {
  if (exists(hash)) return hash;
  let candidates: string[] = [];
  if (hash === 'content-area') candidates = ['nd-page'];
  else if (hash.startsWith('authorization-')) candidates = ['authorization'];
  else if (hash.startsWith('body-')) candidates = ['request-body'];
  else if (hash.startsWith('response-')) candidates = ['response-body'];
  else if (hash.startsWith('parameter-')) {
    const field = hash.slice('parameter-'.length).replace(/-one-of-\d+$/, '').replaceAll('-', '_');
    candidates = ['path', 'query', 'header'].map((kind) => `parameters.${kind}.${field}`);
    candidates.push('parameters-path', 'parameters-query', 'parameters-header');
  } else return undefined;
  // Retired endpoint redirects may land on a guide without API sections.
  return [...candidates, 'page-title'].find(exists);
}

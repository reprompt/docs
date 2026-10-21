import { writeFile } from 'node:fs/promises';
import { assertLocalReferences } from '../lib/specs';

const response = await fetch('https://api.reprompt.io/v2/openapi.json', { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`V2 schema fetch failed: HTTP ${response.status}`);
const schema = await response.json();
if (!schema.paths?.['/enrich'] || !schema.paths?.['/attributes']) throw new Error('V2 snapshot is missing required endpoints.');
for (const path of ['/find-places', '/placematch', '/validate']) {
  if (schema.paths[path]) throw new Error(`Refusing to restore retired endpoint: ${path}`);
}
assertLocalReferences(schema);
await writeFile('openapi-v2.json', `${JSON.stringify(schema, null, 2)}\n`);
console.log('Updated openapi-v2.json. Review the diff before committing.');

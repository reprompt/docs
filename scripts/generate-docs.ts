import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { generateFiles } from 'fumadocs-openapi';
import { openapi } from '../lib/openapi';
import { apiRoutes, getApiSlug } from '../lib/api-routes';
import { readSpec, specFiles } from '../lib/specs';

const output = 'content/docs/api-reference';
// This directory contains generated files only. Guides are never rewritten.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await generateFiles({
  input: openapi,
  output,
  per: 'operation',
  groupBy: 'none',
  name(entry) {
    if (entry.type !== 'operation') throw new Error('Only API operations are supported.');
    return getApiSlug(entry.schemaId, entry.item.method, entry.item.path);
  },
  includeDescription: true,
  frontmatter: (_title, description) => ({
    description: description?.split('\n')[0].replace(/[`*_]/g, '').slice(0, 200),
  }),
});

const specs = { v1: readSpec('v1'), search: readSpec('search'), v2: readSpec('v2') };
const sections = [
  ['Place enrichment', 'v1'], ['Search & Answers', 'search'], ['V2 experimental', 'v2'],
] as const;
let index = '---\ntitle: API Reference\ndescription: Explore the Reprompt API. Authenticate with your API key to try requests directly from the reference.\n---\n\n';
index += '<Note>Get your API key from [Organization Settings](https://app.repromptai.com/organization). Place enrichment V1 uses your organization slug in the URL; Search, Ask, and V2 resolve it from your key.</Note>\n\n';
for (const [heading, id] of sections) {
  index += `## ${heading}\n\n`;
  for (const [spec, method, path, slug] of apiRoutes.filter(([spec]) => spec === id)) {
    const operation = specs[spec].paths?.[path]?.[method];
    if (!operation) throw new Error(`Missing operation: ${spec} ${method} ${path}`);
    index += `- [${operation.summary ?? path}](/api-reference/${slug}) — \`${method.toUpperCase()} ${path}\`\n`;
  }
  index += '\n';
}
index += '## OpenAPI downloads\n\n- [Place enrichment V1](/openapi-v1.json)\n- [Search and Ask](/openapi-search-ask-v1.json)\n- [V2 experimental](/openapi-v2.json)\n';
await writeFile(`${output}/index.mdx`, index);

const metas: Record<string, unknown> = {
  '': { title: 'API Reference', defaultOpen: true, pages: ['index', 'enrich-a-single-place-synchronously', 'jobs', 'batches', 'exports', 'attributes', 'search-&-answers', 'enrichments'] },
  jobs: { title: 'Jobs', pages: apiRoutes.filter((r) => r[3].startsWith('jobs/')).map((r) => r[3].split('/')[1]) },
  batches: { title: 'Batches', pages: apiRoutes.filter((r) => r[3].startsWith('batches/')).map((r) => r[3].split('/')[1]) },
  exports: { title: 'CSV Exports', pages: apiRoutes.filter((r) => r[3].startsWith('exports/')).map((r) => r[3].split('/')[1]) },
  attributes: { title: 'Attributes' },
  'search-&-answers': { title: 'Search & Answers', defaultOpen: true, pages: ['search-the-web', 'get-a-fast-source-backed-answer'] },
  enrichments: { title: 'V2 experimental', defaultOpen: true, pages: ['enrich', 'list-attributes'] },
};
for (const [folder, meta] of Object.entries(metas)) {
  await writeFile(`${output}/${folder ? `${folder}/` : ''}meta.json`, `${JSON.stringify(meta, null, 2)}\n`);
}

// Publish the same normalized, validated specs used by the reference.
for (const [id, file] of Object.entries(specFiles)) {
  await writeFile(`public/${file}`, `${JSON.stringify(specs[id as keyof typeof specs], null, 2)}\n`);
}

// A plain-text index keeps agent clients usable without a hosted AI service.
const { glob } = await import('node:fs/promises');
const matter = (await import('gray-matter')).default;
const pages = [];
for await (const file of glob('**/*.mdx', { cwd: 'content/docs' })) {
  const { data, content } = matter(await readFile(`content/docs/${file}`, 'utf8'));
  const slug = file.replace(/\.mdx$/, '').replace(/\/index$/, '');
  pages.push({ slug, title: String(data.title), description: String(data.description ?? ''), content });
}
pages.sort((a, b) => a.slug.localeCompare(b.slug));
await writeFile('public/llms.txt', `# Reprompt\n\nAPI documentation for place enrichment, web search, and grounded answers.\n\n## Documentation\n\n${pages.map((page) => `- [${page.title}](https://docs.repromptai.com/${page.slug})${page.description ? `: ${page.description}` : ''}`).join('\n')}\n\n## OpenAPI Specs\n\n${Object.values(specFiles).map((file) => `- [${file}](https://docs.repromptai.com/${file})`).join('\n')}\n`);
await writeFile('public/docs-manifest.json', JSON.stringify(pages.map(({ content: _, ...page }) => page), null, 2));
console.log(`Generated ${apiRoutes.length} API pages; ${pages.length} total public pages.`);

// Preserve Mintlify's machine-readable page URLs, including API details.
const markdownPages = [];
for (const page of pages) {
  const route = apiRoutes.find((entry) => `api-reference/${entry[3]}` === page.slug);
  let content = page.content;
  if (route) {
    const [id, method, path] = route;
    content = `${specs[id].paths?.[path]?.[method]?.description ?? ''}\n\n## Endpoint\n\n\`${method.toUpperCase()} ${path}\`\n\n## OpenAPI operation\n\n\`\`\`json\n${JSON.stringify(specs[id].paths?.[path]?.[method], null, 2)}\n\`\`\`\n\nFull schemas and authentication: [OpenAPI specification](/${specFiles[id]}).\n`;
  }
  const markdown = `# ${page.title}\n\n${page.description}\n\n${content}\n`;
  const path = `public/${page.slug}.md`;
  await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  await writeFile(path, markdown);
  markdownPages.push(markdown);
}
await writeFile('public/llms-full.txt', markdownPages.join('\n\n---\n\n'));

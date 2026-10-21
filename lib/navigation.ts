import type { Folder, Item, Node, Root } from 'fumadocs-core/page-tree';
import { flattenTree } from 'fumadocs-core/page-tree';

export function createVersionNavigation(tree: Root): [Folder, Folder] {
  const pages = new Map(flattenTree(tree.children).map((page) => [page.url, page]));
  function page(url: string): Item {
    const found = pages.get(url);
    if (!found) throw new Error(`Missing navigation page: ${url}`);
    return found;
  }
  const section = (name: string): Node => ({ type: 'separator', name });
  function group(name: string, prefix: string): Folder {
    return { type: 'folder', name, children: [...pages.values()].filter((item) => item.url.startsWith(prefix)) };
  }
  return [
    {
      type: 'folder', root: true, $id: 'version-v1', name: 'V1',
      children: [
        page('/guides/quickstart'),
        section('API Reference'),
        page('/api-reference'),
        page('/api-reference/enrich-a-single-place-synchronously'),
        group('Jobs', '/api-reference/jobs/'),
        group('Batches', '/api-reference/batches/'),
        group('CSV Exports', '/api-reference/exports/'),
        group('Attributes', '/api-reference/attributes/'),
        section('Search & Answers'),
        page('/guides/search-and-ask'),
        section('Search & Answers API Reference'),
        page('/api-reference/search-&-answers/search-the-web'),
        page('/api-reference/search-&-answers/get-a-fast-source-backed-answer'),
        section('Guides'),
        ...['csv-upload', 'batch-processing', 'csv-export', 'troubleshooting-40x', 'open-closed', 'monthly-refresh', 'place-job-results'].map((slug) => page(`/guides/${slug}`)),
        page('/schemas/schemas'),
      ],
    },
    {
      type: 'folder', root: true, $id: 'version-v2', name: 'V2 experimental',
      children: [
        section('V2 API Reference'),
        page('/api-reference/enrichments/enrich'),
        page('/api-reference/enrichments/list-attributes'),
        section('Guides'),
        page('/guides/troubleshooting-40x'),
        page('/guides/agents-in-api'),
      ],
    },
  ];
}

export function navigationVersion(pathname: string, previous: 'v1' | 'v2' = 'v1'): 'v1' | 'v2' {
  if (pathname === '/guides/troubleshooting-40x') return previous;
  return pathname.startsWith('/api-reference/enrichments/') || pathname === '/guides/agents-in-api' ? 'v2' : 'v1';
}

const pageRedirects = [
  { source: '/guides/tripadvisor-category', destination: '/schemas/schemas', permanent: false },
  { source: '/', destination: '/guides/quickstart', permanent: true },
  { source: '/quickstart', destination: '/guides/quickstart', permanent: true },
  { source: '/introduction', destination: '/guides/quickstart', permanent: true },
  { source: '/guides/troubleshooting', destination: '/guides/troubleshooting-40x', permanent: true },
  { source: '/guides/place-enrichment', destination: '/guides/quickstart', permanent: true },
  { source: '/api-reference/attributes/get-enrichment-attributes', destination: '/api-reference/attributes/get-all-available-attributes', permanent: true },
  { source: '/api-reference/batches/mark-batches-for-refresh', destination: '/guides/monthly-refresh', permanent: false },
];

export const redirects = [...pageRedirects, ...pageRedirects.filter((entry) => entry.source !== '/').map((entry) => ({ ...entry, source: `${entry.source}.md`, destination: `${entry.destination}.md` }))];

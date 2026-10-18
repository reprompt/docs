// Next may encode reserved characters in static route params. Fumadocs uses
// encodeURI for its slugs, so normalize both encoded and decoded request paths.
export function normalizeSlugs(slugs?: string[]): string[] | undefined {
  return slugs?.map((slug) => {
    try { return encodeURI(decodeURIComponent(slug)); }
    catch { return slug; }
  });
}

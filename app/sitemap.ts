import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';

export default function sitemap(): MetadataRoute.Sitemap {
  // Next's sitemap serializer writes URLs directly into XML. Percent-encode
  // ampersands in legacy paths so they remain valid URLs and valid XML text.
  return source.getPages().map((page) => ({ url: `https://docs.repromptai.com${page.url.replaceAll('&', '%26')}` }));
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { source } from '@/lib/source';
import { openapi } from '@/lib/openapi';
import { OpenAPIPage } from '@/components/api-page';
import { getMDXComponents } from '@/components/mdx';
import { LegacyAnchors } from '@/components/legacy-anchors';
import { normalizeSlugs } from '@/lib/routes';

type Props = { params: Promise<{ slug?: string[] }> };
export const dynamicParams = false;

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const page = source.getPage(normalizeSlugs(slug));
  if (!page) notFound();
  const Content = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <LegacyAnchors />
      <DocsTitle id="page-title">{page.data.title}</DocsTitle>
      {!('_openapi' in page.data) && <DocsDescription>{page.data.description}</DocsDescription>}
      <DocsBody>
        <Content components={getMDXComponents({
          OpenAPIPage: async (props) => <OpenAPIPage {...await openapi.preloadOpenAPIPage(page)} {...props} />,
        })} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() { return source.generateParams(); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(normalizeSlugs(slug));
  if (!page) notFound();
  return { title: page.data.title, description: page.data.description, alternates: { canonical: page.url } };
}

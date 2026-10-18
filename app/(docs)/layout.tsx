import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { layoutOptions } from '@/lib/layout';

export default function Layout({ children }: { children: ReactNode }) {
  return <DocsLayout {...layoutOptions} tree={source.pageTree} tabs={false}>{children}</DocsLayout>;
}

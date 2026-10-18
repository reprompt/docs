import type { ReactNode } from 'react';
import { VersionedDocsLayout } from '@/components/docs-layout';
import { source } from '@/lib/source';
import { layoutOptions } from '@/lib/layout';
import { createVersionNavigation } from '@/lib/navigation';

export default function Layout({ children }: { children: ReactNode }) {
  return <VersionedDocsLayout {...layoutOptions} versions={createVersionNavigation(source.pageTree)}>{children}</VersionedDocsLayout>;
}

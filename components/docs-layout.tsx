'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { DocsLayout, type DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import { getLayoutTabs } from 'fumadocs-ui/layouts/shared';
import type { Folder } from 'fumadocs-core/page-tree';
import { navigationVersion } from '@/lib/navigation';

export function VersionedDocsLayout({ versions, children, ...props }: Omit<DocsLayoutProps, 'tree'> & { versions: [Folder, Folder]; children: ReactNode }) {
  const pathname = usePathname();
  const [selection, setSelection] = useState(() => ({ pathname, version: navigationVersion(pathname) }));
  const version = navigationVersion(pathname, selection.version);
  if (selection.pathname !== pathname) setSelection({ pathname, version });

  // The shared troubleshooting URL stays in the version the reader came from.
  // Keep the switcher order fixed, while resolving the shared page in that root.
  const roots = versions.map((root, index) => ({
    ...root,
    children: root.children.filter((item) =>
      item.type !== 'page' || item.url !== '/guides/troubleshooting-40x' || index === (version === 'v1' ? 0 : 1),
    ),
  }));
  const tree = { $id: `navigation-${version}`, name: 'Documentation', children: roots };
  const tabs = getLayoutTabs(tree);
  return <DocsLayout {...props} tree={tree} tabs={tabs}>{children}</DocsLayout>;
}

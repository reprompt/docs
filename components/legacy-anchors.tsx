'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Mintlify schema-field links fall back to their corresponding API section.
// Authored guide headings retain their exact IDs in the MDX source.
export function LegacyAnchors() {
  const pathname = usePathname();
  useEffect(() => {
    function followLegacyAnchor() {
      let hash: string;
      try { hash = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      if (!hash || document.getElementById(hash)) return;
      const target = hash === 'content-area' ? 'nd-page'
        : hash.startsWith('authorization-') ? 'authorization'
        : hash.startsWith('body-') ? 'request-body'
        : hash.startsWith('response-') ? 'response-body'
        : hash.startsWith('parameter-') ? 'parameters-query' : undefined;
      if (target) document.getElementById(target)?.scrollIntoView();
    }
    followLegacyAnchor();
    window.addEventListener('hashchange', followLegacyAnchor);
    return () => window.removeEventListener('hashchange', followLegacyAnchor);
  }, [pathname]);
  return null;
}

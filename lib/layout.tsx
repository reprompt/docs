import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

export const layoutOptions: BaseLayoutProps = {
  nav: {
    url: '/guides/quickstart',
    title: (
      <span className="flex items-center gap-3">
        <Image src="/logo/light.svg" alt="Reprompt" width={126} height={27} style={{ height: 'auto' }} className="dark:hidden" priority />
        <Image src="/logo/dark.svg" alt="Reprompt" width={126} height={27} style={{ height: 'auto' }} className="hidden dark:block" priority />
        <span className="border-l border-fd-border pl-3 text-sm font-normal text-fd-muted-foreground">Docs</span>
      </span>
    ),
  },
  links: [{ text: 'Dashboard', url: 'https://app.repromptai.com', external: true }],
  githubUrl: 'https://github.com/reprompt',
};

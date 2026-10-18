import { createMDX } from 'fumadocs-mdx/next';
import { redirects } from './lib/redirects.mjs';

const withMDX = createMDX();

export default withMDX({
  reactStrictMode: true,
  async redirects() { return redirects; },
});

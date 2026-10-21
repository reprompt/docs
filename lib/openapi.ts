import { createOpenAPI } from 'fumadocs-openapi/server';
import { readSpec } from './specs';

export const openapi = createOpenAPI({
  input: {
    v1: () => readSpec('v1'),
    search: () => readSpec('search'),
    v2: () => readSpec('v2'),
  },
});

import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ['@orion-ui/registry'],
};

export default createMDX()(config);

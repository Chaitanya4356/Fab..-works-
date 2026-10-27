import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The PDF fonts are read from disk at run time, so they must ship with these routes (spec 4.6).
  outputFileTracingIncludes: {
    '/api/pdf/**': ['src/lib/pdf/fonts/*.ttf'],
    '/quotes/**': ['src/lib/pdf/fonts/*.ttf'],
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig

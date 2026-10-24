import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SteelFlow',
    short_name: 'SteelFlow',
    description: 'Workshop management for steel fabrication',
    start_url: '/',
    display: 'standalone',
    background_color: '#EDF0F2',
    theme_color: '#1B232A',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png' },
    ],
  }
}

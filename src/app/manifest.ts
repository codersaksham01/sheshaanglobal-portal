import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sheshaan Global Smart Portal',
    short_name: 'Sheshaan Portal',
    description: 'Commercial intelligence, CRM, quotes, accounts, freight, documents, and shipment operations.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f1f5f9',
    theme_color: '#020617',
    icons: [
      { src: '/logo.png', sizes: 'any', type: 'image/png', purpose: 'any' }
    ]
  };
}

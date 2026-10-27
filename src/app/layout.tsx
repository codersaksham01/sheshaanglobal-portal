import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#07111f',
};

export const metadata: Metadata = {
  title: 'Sheshaan Global Admin Portal',
  description: 'Connected CRM, quote automation, accounts, tasks, communications, documents, and shipment operations for Sheshaan Global.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sheshaan Global'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth-context";
import { SenseiProvider } from "@/contexts/sensei-context";
import { SenseiChat } from "@/components/sensei-chat";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ProductionConsoleGuard } from "@/components/ProductionConsoleGuard";

export const metadata: Metadata = {
  title: 'Bugrit - Code Security & Quality Scanner',
  description: 'One-click security and quality scanning for your codebase. Built for developers who move fast.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/safari-pinned-tab.png', color: '#f97316' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bugrit',
  },
  openGraph: {
    title: 'Bugrit - Code Security & Quality Scanner',
    description: 'One-click security and quality scanning for your codebase. Built for developers who move fast.',
    images: [{ url: '/icons/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bugrit - Code Security & Quality Scanner',
    description: 'One-click security and quality scanning for your codebase. Built for developers who move fast.',
    images: ['/icons/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased bg-white">
        <ProductionConsoleGuard />
        <ErrorBoundary>
          <AuthProvider>
            <SenseiProvider>
              {children}
              <SenseiChat />
            </SenseiProvider>
            <Toaster />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}


import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { LayoutProvider } from '@/components/common/LayoutProvider';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { fetchSettings } from '@/lib/settings-service';
import { AuthProvider } from '@/context/AuthContext';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSettings();
  return {
    title: {
      default: settings.siteName,
      template: `%s | ${settings.siteName}`,
    },
    description: settings.siteDescription,
    icons: null,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await fetchSettings();
  return (
    <html lang="en" className="!scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        <AuthProvider>
          <LayoutProvider key="layout-provider" header={<Header key="header" settings={settings} />} footer={<Footer key="footer" settings={settings} />}>
            {children}
          </LayoutProvider>
          <Toaster key="toaster" />
        </AuthProvider>
      </body>
    </html>
  );
}

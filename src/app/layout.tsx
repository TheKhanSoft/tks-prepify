
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext';
import { Inter } from 'next/font/google';

import { ReactNode } from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { fetchSettings } from "@/lib/settings-service";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
    title: 'TKS Prepify',
    description: 'The best place to prepare for your exams.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await fetchSettings();
  return (
    <html lang="en" className="!scroll-smooth" suppressHydrationWarning={true}>
      <body className={`${inter.variable} font-body antialiased`}>
        <AuthProvider>
          <div className="flex flex-col min-h-screen bg-background">
            <Header settings={settings} />
            <main className="flex-grow">{children}</main>
            <Footer settings={settings} />
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}


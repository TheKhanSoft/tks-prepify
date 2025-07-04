"use client"

import { usePathname } from 'next/navigation'

export function LayoutProvider({ 
    header, 
    footer, 
    children 
}: { 
    header: React.ReactNode, 
    footer: React.ReactNode, 
    children: React.ReactNode 
}) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');
  const isAccountPage = pathname.startsWith('/account');

  if (isAdminPage || isAccountPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {header}
      <main className="flex-grow">{children}</main>
      {footer}
    </div>
  );
}

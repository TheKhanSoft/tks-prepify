
import { ReactNode } from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { fetchSettings } from "@/lib/settings-service";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const settings = await fetchSettings();
  
  // A simple check to see if the children's route might be the invoice page
  // This is a workaround as we can't use usePathname directly in a server component.
  // In a real app, you might have a more robust way to identify layout variations.
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header settings={settings} />
      <main className="flex-grow">{children}</main>
      <Footer settings={settings} />
    </div>
  );
}

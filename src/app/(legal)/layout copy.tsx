
import { ReactNode } from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { fetchSettings } from "@/lib/settings-service";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const settings = await fetchSettings();
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header settings={settings} />
      <main className="flex-grow">{children}</main>
      <Footer settings={settings} />
    </div>
  );
}

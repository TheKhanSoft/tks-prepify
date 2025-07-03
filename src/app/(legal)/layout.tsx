
import { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto max-w-4xl px-6 sm:px-10 lg:px-16 py-12 md:py-16">
        {children}
    </div>
  );
}

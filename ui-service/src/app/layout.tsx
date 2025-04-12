import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsButton } from "@/components/settings-button";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TidyData - Personal Knowledge Management",
  description: "A high-performance, self-hosted personal knowledge management system with semantic search capabilities.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="min-h-screen bg-background flex flex-col">
          <header className="border-b">
            <div className="flex h-14 items-center justify-between px-4 w-full">
              <div className="font-bold text-xl">TidyData</div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground hidden sm:block">
                  Press{" "}
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                    <span className="text-xs">⌘</span>K
                  </kbd>{" "}
                  to focus search,{" "}
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                    <span className="text-xs">⌘</span>I
                  </kbd>{" "}
                  to add content
                </div>
                <div className="border-l h-6 hidden sm:block" />
                <SettingsButton />
              </div>
            </div>
          </header>
          <main className="flex-1 container mx-auto py-6 px-4">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

"use client";

import { SessionProvider } from "next-auth/react";
import { Header } from "@/components/Header";
import { LocaleProvider } from "@/components/LocaleProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LocaleProvider>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-[var(--pc-border)] py-5 text-center text-xs text-[var(--pc-faint)]">
            Pro Clubs Dashboard · unofficial EA SPORTS FC 26 data ·{" "}
            <a
              href="https://github.com/1erkandogan/fc26-clubs-api"
              className="text-[var(--pc-muted)] underline-offset-2 transition hover:text-[var(--pc-accent)] hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              fc26-clubs-api
            </a>
          </footer>
        </div>
      </LocaleProvider>
    </SessionProvider>
  );
}

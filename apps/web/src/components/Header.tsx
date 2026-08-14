"use client";

import Link from "next/link";
import { Locale, t } from "@/lib/i18n";
import { useLocale } from "@/components/LocaleProvider";

function LogoMark() {
  return (
    <span
      className="grid h-8 w-8 place-items-center rounded-[10px] bg-[var(--pc-accent)] text-white"
      aria-hidden
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 1.4 2.6 3.6v4.3c0 3.2 2.2 5.4 5.4 6.7 3.2-1.3 5.4-3.5 5.4-6.7V3.6L8 1.4Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M5.2 8.2 7.1 10l3.7-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Header() {
  const { locale, setLocale } = useLocale();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--pc-border)] bg-[rgba(243,245,242,0.86)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          <LogoMark />
          <span className="flex flex-col leading-none">
            <span className="font-[family-name:var(--font-display)] text-[15px] font-bold tracking-tight text-[var(--pc-text)] transition group-hover:text-[var(--pc-accent)]">
              {t(locale, "app.brand")}
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--pc-faint)]">
              {t(locale, "app.tagline")}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2.5 text-sm">
          <div className="flex rounded-full border border-[var(--pc-border)] bg-[var(--pc-surface)] p-0.5">
            {(["pt", "en"] as Locale[]).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                aria-pressed={locale === l}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  locale === l
                    ? "bg-[var(--pc-accent)] text-white"
                    : "text-[var(--pc-muted)] hover:text-[var(--pc-text)]"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

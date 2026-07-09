"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";
import { Locale, t } from "@/lib/i18n";
import { useLocale } from "@/components/LocaleProvider";

function LogoMark() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-[var(--pc-accent)] to-[var(--pc-accent-dim)] text-base shadow-[0_0_20px_rgba(0,230,118,0.35)]">
      ⚽
    </span>
  );
}

export function Header() {
  const { locale, setLocale } = useLocale();
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--pc-border)] bg-[rgba(5,8,10,0.75)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          <LogoMark />
          <span className="flex flex-col leading-none">
            <span className="font-[family-name:var(--font-display)] text-[15px] font-bold tracking-tight text-[var(--pc-text)] transition group-hover:text-[var(--pc-accent)]">
              {t(locale, "app.brand")}
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--pc-faint)]">
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
                    ? "bg-[var(--pc-accent-soft)] text-[var(--pc-accent)]"
                    : "text-[var(--pc-muted)] hover:text-[var(--pc-text)]"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {session ? (
            <div className="flex items-center gap-2">
              <span className="hidden max-w-[180px] truncate text-xs text-[var(--pc-muted)] sm:block">
                {session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                title={t(locale, "nav.logout")}
                className="flex items-center gap-1.5 rounded-full border border-[var(--pc-border)] bg-[var(--pc-surface)] px-3 py-1.5 text-xs font-medium text-[var(--pc-muted)] transition hover:border-[var(--pc-accent-border)] hover:text-[var(--pc-text)]"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">{t(locale, "nav.logout")}</span>
              </button>
            </div>
          ) : (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
              className="flex items-center gap-1.5 rounded-full border border-[var(--pc-accent-border)] bg-[var(--pc-accent-soft)] px-3.5 py-1.5 text-xs font-semibold text-[var(--pc-accent)] transition hover:bg-[rgba(0,230,118,0.18)]"
            >
              <LogIn size={13} />
              {t(locale, "nav.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

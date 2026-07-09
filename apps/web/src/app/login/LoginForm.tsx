"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, Loader2, Lock, Mail } from "lucide-react";
import { registerWithApi } from "@/lib/api";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function LoginForm() {
  const { locale } = useLocale();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "register") {
        await registerWithApi(email, password);
      }
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) setError(t(locale, "login.invalid_credentials"));
      else window.location.href = callbackUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "login.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm pt-8 md:pt-16">
      <div className="animate-rise">
        <div className="mb-8 text-center">
          <h1 className="text-3xl">
            {mode === "login" ? t(locale, "login.title") : t(locale, "login.register_title")}
          </h1>
          <p className="mt-2 text-sm text-[var(--pc-muted)]">{t(locale, "login.subtitle")}</p>
        </div>

        <div className="pc-card space-y-4 !p-6">
          <button
            className="btn-ghost w-full"
            onClick={() => signIn("google", { callbackUrl })}
            type="button"
          >
            <GoogleIcon />
            {t(locale, "login.google")}
          </button>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-[var(--pc-faint)]">
            <span className="h-px flex-1 bg-[var(--pc-border)]" />
            {t(locale, "login.or")}
            <span className="h-px flex-1 bg-[var(--pc-border)]" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <div className="relative">
              <Mail
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--pc-faint)]"
              />
              <input
                className="input-field pl-10"
                type="email"
                placeholder={t(locale, "login.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="relative">
              <Lock
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--pc-faint)]"
              />
              <input
                className="input-field pl-10"
                type="password"
                placeholder={t(locale, "login.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </div>
            <button className="btn-primary w-full" type="submit" disabled={submitting}>
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {mode === "login" ? t(locale, "login.sign_in") : t(locale, "login.create_account")}
            </button>
          </form>

          {error && (
            <p className="rounded-lg bg-[var(--pc-loss-soft)] px-3 py-2 text-sm text-[var(--pc-loss)]">
              {error}
            </p>
          )}

          <button
            className="w-full text-center text-sm text-[var(--pc-muted)] transition hover:text-[var(--pc-accent)]"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            type="button"
          >
            {mode === "login" ? t(locale, "login.need_account") : t(locale, "login.have_account")}
          </button>
        </div>

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm text-[var(--pc-faint)] transition hover:text-[var(--pc-text)]"
        >
          <ArrowLeft size={14} />
          {t(locale, "nav.back")}
        </Link>
      </div>
    </div>
  );
}

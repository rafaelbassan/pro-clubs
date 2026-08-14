"use client";

import { FormEvent, useEffect, useState } from "react";
import { getClubSettings, updateClubSettings } from "@/lib/api";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";

export function ClubSettingsModal({
  clubId,
  onClose,
  onSaved,
}: {
  clubId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { locale } = useLocale();
  const [slug, setSlug] = useState("");
  const [crestUrl, setCrestUrl] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getClubSettings(clubId)
      .then((s) => {
        setSlug(s.slug || "");
        setCrestUrl(s.crest_url || "");
        setHasPin(s.has_admin_pin);
      })
      .catch(() => undefined);
  }, [clubId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateClubSettings(clubId, {
        slug: slug || undefined,
        crest_url: crestUrl || undefined,
        admin_pin: adminPin || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pc-modal-backdrop" onClick={onClose} role="presentation">
      <div className="pc-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">{t(locale, "settings.title")}</h2>
        <p className="mt-1 text-sm text-[var(--pc-muted)]">{t(locale, "settings.subtitle")}</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-[var(--pc-muted)]">
            {t(locale, "settings.slug")}
            <input className="input-field mt-1" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </label>
          <label className="block text-xs font-semibold text-[var(--pc-muted)]">
            {t(locale, "settings.crest")}
            <input
              className="input-field mt-1"
              value={crestUrl}
              onChange={(e) => setCrestUrl(e.target.value)}
              placeholder="https://"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--pc-muted)]">
            {t(locale, "settings.admin_pin")}
            <input
              className="input-field mt-1"
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder={hasPin ? "••••" : ""}
            />
          </label>
          {error && <p className="text-sm text-[var(--pc-loss)]">{error}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn-primary flex-1" type="submit" disabled={busy}>
              {t(locale, "common.save")}
            </button>
            <button className="btn-ghost flex-1" type="button" onClick={onClose}>
              {t(locale, "common.close")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

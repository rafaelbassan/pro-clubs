"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Calendar, Plus, Trash2, Trophy } from "lucide-react";
import {
  createSchedule,
  createTrophy,
  deleteSchedule,
  deleteTrophy,
  listSchedule,
  listTrophies,
  type ScheduledMatch,
  type Trophy as TrophyRecord,
} from "@/lib/api";
import { useLocale } from "@/components/LocaleProvider";
import { t } from "@/lib/i18n";

type SubTab = "agenda" | "trofeus";

function formatWhen(value: string, locale: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(locale === "pt" ? "pt-BR" : "en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventosPanel({
  clubId,
  clubName,
  isAdmin,
}: {
  clubId: string;
  clubName: string;
  isAdmin: boolean;
}) {
  const { locale } = useLocale();
  const [sub, setSub] = useState<SubTab>("agenda");
  const [schedule, setSchedule] = useState<ScheduledMatch[]>([]);
  const [trophies, setTrophies] = useState<TrophyRecord[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    Promise.all([listSchedule(clubId), listTrophies(clubId)])
      .then(([s, tr]) => {
        setSchedule(s);
        setTrophies(tr);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduledMatch[]>();
    [...schedule]
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .forEach((item) => {
        const key = item.scheduled_at.slice(0, 10);
        map.set(key, [...(map.get(key) || []), item]);
      });
    return [...map.entries()];
  }, [schedule]);

  async function onAddEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await createSchedule(clubId, {
        opponent_name: String(form.get("opponent_name") || ""),
        scheduled_at: String(form.get("scheduled_at") || ""),
        league: String(form.get("league") || ""),
        stage: String(form.get("stage") || ""),
        is_cup: form.get("is_cup") === "on",
      });
      e.currentTarget.reset();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onAddTrophy(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await createTrophy(clubId, {
        title: String(form.get("title") || ""),
        organization: String(form.get("organization") || ""),
        won_at: String(form.get("won_at") || "") || null,
        scope: String(form.get("scope") || "regional"),
        champions: [],
      });
      e.currentTarget.reset();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="pc-tablist mb-4">
        <button type="button" className={`pc-tab ${sub === "agenda" ? "pc-tab-active" : ""}`} onClick={() => setSub("agenda")}>
          {t(locale, "eventos.agenda")}
        </button>
        <button type="button" className={`pc-tab ${sub === "trofeus" ? "pc-tab-active" : ""}`} onClick={() => setSub("trofeus")}>
          {t(locale, "eventos.trophies")}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-[var(--pc-loss-soft)] px-3 py-2 text-sm text-[var(--pc-loss)]">{error}</div>
      )}

      {sub === "agenda" && (
        <div className="space-y-4">
          {isAdmin && (
            <form onSubmit={onAddEvent} className="pc-card grid gap-2 sm:grid-cols-2">
              <p className="sm:col-span-2 text-sm font-semibold">{t(locale, "eventos.new_game")}</p>
              <input className="input-field" name="opponent_name" required placeholder={t(locale, "table.opponent")} />
              <input className="input-field" name="scheduled_at" type="datetime-local" required />
              <input className="input-field" name="league" placeholder={t(locale, "eventos.league")} />
              <input className="input-field" name="stage" placeholder={t(locale, "eventos.stage")} />
              <label className="flex items-center gap-2 text-sm text-[var(--pc-muted)]">
                <input type="checkbox" name="is_cup" />
                {t(locale, "eventos.cup")}
              </label>
              <button className="btn-primary sm:justify-self-end" disabled={busy} type="submit">
                <Plus size={14} />
                {t(locale, "eventos.new_game")}
              </button>
            </form>
          )}

          {grouped.length === 0 && (
            <div className="pc-card text-sm text-[var(--pc-muted)]">{t(locale, "eventos.empty_schedule")}</div>
          )}

          {grouped.map(([day, items]) => (
            <div key={day}>
              <p className="pc-section-label mb-2 flex items-center gap-1.5">
                <Calendar size={12} />
                {new Date(day).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </p>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="pc-card flex items-center justify-between gap-3 !py-3">
                    <div className="min-w-0">
                      <div className="font-semibold">
                        {clubName} vs {item.opponent_name}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--pc-muted)]">
                        {formatWhen(item.scheduled_at, locale)}
                        {item.league ? ` · ${item.league}` : ""}
                        {item.stage ? ` · ${item.stage}` : ""}
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn-ghost !p-2 text-[var(--pc-loss)]"
                        onClick={() => deleteSchedule(clubId, item.id).then(load)}
                        title={t(locale, "common.close")}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {sub === "trofeus" && (
        <div className="space-y-4">
          {isAdmin && (
            <form onSubmit={onAddTrophy} className="pc-card grid gap-2 sm:grid-cols-2">
              <p className="sm:col-span-2 text-sm font-semibold">{t(locale, "eventos.add_trophy")}</p>
              <input className="input-field" name="title" required placeholder={t(locale, "eventos.trophy_title")} />
              <input className="input-field" name="organization" placeholder={t(locale, "eventos.organization")} />
              <input className="input-field" name="won_at" type="date" />
              <select className="input-field" name="scope" defaultValue="regional">
                <option value="regional">{t(locale, "eventos.scope_regional")}</option>
                <option value="nacional">{t(locale, "eventos.scope_national")}</option>
                <option value="internacional">{t(locale, "eventos.scope_international")}</option>
              </select>
              <button className="btn-primary sm:col-span-2" disabled={busy} type="submit">
                <Plus size={14} />
                {t(locale, "eventos.add_trophy")}
              </button>
            </form>
          )}

          {trophies.length === 0 && (
            <div className="pc-card text-sm text-[var(--pc-muted)]">{t(locale, "eventos.empty_trophies")}</div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {trophies.map((tr) => (
              <div key={tr.id} className="pc-card relative text-center">
                <span className="chip absolute right-3 top-3 text-[10px] uppercase">{tr.scope}</span>
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--pc-draw-soft)] text-[var(--pc-draw)]">
                  <Trophy size={22} />
                </div>
                <div className="font-semibold">{tr.title}</div>
                <div className="mt-1 text-xs text-[var(--pc-muted)]">
                  {tr.organization}
                  {tr.won_at ? ` · ${new Date(tr.won_at).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US")}` : ""}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    className="btn-ghost mt-3 !py-1 text-xs text-[var(--pc-loss)]"
                    onClick={() => deleteTrophy(clubId, tr.id).then(load)}
                  >
                    {t(locale, "common.close")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

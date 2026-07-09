import pt from "@/messages/pt.json";
import en from "@/messages/en.json";

export type Locale = "pt" | "en";

const catalogs: Record<Locale, Record<string, string>> = { pt, en };

export function t(locale: Locale, key: string, vars?: Record<string, string | number>) {
  let value = catalogs[locale][key] ?? catalogs.en[key] ?? key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      value = value.replace(`{${k}}`, String(v));
    });
  }
  return value;
}

export function matchTypeLabel(locale: Locale, type: string, plural = false) {
  const key = plural ? `${type}_plural` : type;
  return t(locale, `match_type.${key}`);
}

export function resultLabel(locale: Locale, code: string) {
  return t(locale, `results.code.${code}`);
}

import en from '../locales/en.json';
import vi from '../locales/vi.json';

export type AppLocale = 'en' | 'vi';

export type TranslateArgs = Record<string, string | number>;

const catalogs: Record<AppLocale, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  vi: vi as Record<string, unknown>,
};

export const DEFAULT_LOCALE: AppLocale = 'vi';

export function isAppLocale(value: string): value is AppLocale {
  return value === 'en' || value === 'vi';
}

/** Parse Accept-Language → en | vi (default vi). */
export function parseAcceptLanguage(
  header?: string | string[] | null,
): AppLocale {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return DEFAULT_LOCALE;
  const primary = raw.split(',')[0]?.trim().toLowerCase() ?? '';
  if (primary.startsWith('en')) return 'en';
  if (primary.startsWith('vi')) return 'vi';
  return DEFAULT_LOCALE;
}

function lookup(
  tree: Record<string, unknown>,
  key: string,
): string | undefined {
  const parts = key.split('.');
  let cur: unknown = tree;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(template: string, args?: TranslateArgs): string {
  if (!args) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    args[name] !== undefined ? String(args[name]) : `{{${name}}}`,
  );
}

/**
 * Shared t() — frontend & backend dùng chung JSON locales.
 * Key dạng nested: `nav.recipes`, `errors.invalidCredentials`
 */
export function t(
  locale: AppLocale,
  key: string,
  args?: TranslateArgs,
): string {
  const fromLocale = lookup(catalogs[locale], key);
  const fromFallback =
    locale === 'en' ? undefined : lookup(catalogs.en, key);
  const template = fromLocale ?? fromFallback ?? key;
  return interpolate(template, args);
}

/** True nếu chuỗi trông giống i18n key (errors.foo / validation.bar). */
export function looksLikeMessageKey(value: string): boolean {
  return /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/i.test(value.trim());
}

export function translateMaybeKey(
  locale: AppLocale,
  value: string,
  args?: TranslateArgs,
): string {
  if (looksLikeMessageKey(value)) return t(locale, value, args);
  return value;
}

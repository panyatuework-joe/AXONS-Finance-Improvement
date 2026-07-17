// Flat Thai -> English dictionary. Used purely as a display-time wrapper:
// the canonical stored/compared value everywhere in the app stays the
// original Thai string regardless of language, so filtering, search,
// dedupe and status-color logic are never affected by translation.
// Lookup falls back to the original text when no entry exists, which is
// what makes it safe for already-English data (business unit names,
// "THB", category codes, etc.) and for free-text values with no entry.
//
// The actual language content lives in src/locales/en/*.json (one file
// per menu/function, see src/locales/en/index.js) — this file only
// re-exports the merged result under the PHRASES/TEMPLATES names the
// rest of the app already imports, plus the translate()/translateVars()
// helpers.
import { phrases, templates } from './locales/en/index.js';

export const PHRASES = phrases;
export const TEMPLATES = templates;

export function translate(text, language) {
  if (language === 'TH') return text;
  return PHRASES[text] ?? text;
}

export function translateVars(template, vars, language) {
  const resolved = language === 'EN' ? (TEMPLATES[template] ?? template) : template;
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.split(`{${key}}`).join(String(value)),
    resolved,
  );
}

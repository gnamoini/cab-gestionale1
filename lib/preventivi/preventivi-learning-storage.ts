import { PREVENTIVI_LEARNING_STORAGE_KEY } from "@/lib/preventivi/constants";

export type PreventivoLearningStore = {
  version: 1;
  phraseMap: Record<string, string>;
  corrections: { fromNorm: string; to: string; at: string }[];
};

const MAX_CORRECTIONS = 120;
const MAX_PHRASE_KEYS = 400;

function defaultStore(): PreventivoLearningStore {
  return { version: 1, phraseMap: {}, corrections: [] };
}

export function loadPreventiviLearning(): PreventivoLearningStore {
  if (typeof window === "undefined") return defaultStore();
  try {
    const raw = window.localStorage.getItem(PREVENTIVI_LEARNING_STORAGE_KEY);
    if (!raw) return defaultStore();
    const p = JSON.parse(raw) as PreventivoLearningStore;
    if (!p || p.version !== 1) return defaultStore();
    return {
      version: 1,
      phraseMap: typeof p.phraseMap === "object" && p.phraseMap ? p.phraseMap : {},
      corrections: Array.isArray(p.corrections) ? p.corrections : [],
    };
  } catch {
    return defaultStore();
  }
}

export function savePreventiviLearning(s: PreventivoLearningStore): void {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(s.phraseMap);
    const trimmedMap =
      keys.length <= MAX_PHRASE_KEYS
        ? s.phraseMap
        : Object.fromEntries(keys.slice(-MAX_PHRASE_KEYS).map((k) => [k, s.phraseMap[k]!]));
    window.localStorage.setItem(
      PREVENTIVI_LEARNING_STORAGE_KEY,
      JSON.stringify({
        ...s,
        phraseMap: trimmedMap,
        corrections: s.corrections.slice(0, MAX_CORRECTIONS),
      }),
    );
  } catch {
    /* ignore */
  }
}

export function normPhrase(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[""'']/g, "")
    .slice(0, 240);
}

export function lookupLearnedPhrase(technicalChunk: string): string | null {
  const n = normPhrase(technicalChunk);
  if (!n) return null;
  const st = loadPreventiviLearning();
  if (st.phraseMap[n]) return st.phraseMap[n]!;
  for (const [k, v] of Object.entries(st.phraseMap)) {
    if (n.includes(k) || k.includes(n)) return v;
  }
  for (const c of st.corrections) {
    if (n.includes(c.fromNorm) || c.fromNorm.includes(n)) return c.to;
  }
  return null;
}

export function recordDescriptionCorrection(technicalSourceNorm: string, customerFinal: string): void {
  const fromNorm = normPhrase(technicalSourceNorm).slice(0, 400);
  const to = customerFinal.trim();
  if (!fromNorm || !to) return;
  const st = loadPreventiviLearning();
  const phraseMap = { ...st.phraseMap, [fromNorm]: to };
  const corrections = [{ fromNorm, to, at: new Date().toISOString() }, ...st.corrections].slice(0, MAX_CORRECTIONS);
  savePreventiviLearning({ ...st, phraseMap, corrections });
}

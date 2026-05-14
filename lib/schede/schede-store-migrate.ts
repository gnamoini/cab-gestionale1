import type {
  LavorazioneSchedeBundle,
  LavorazioneSchedeStore,
  RigaAddettoOreScheda,
  RigaLavorazioneScheda,
  SchedaLavorazioniDoc,
} from "@/types/schede";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object";
}

/** Migra righe legacy (singolo addetto + ore) al modello multi-addetto. */
export function normalizeRigaLavorazioneScheda(raw: unknown): RigaLavorazioneScheda {
  if (!isRecord(raw)) {
    return {
      id: `riga-${Date.now()}`,
      dataLavorazione: "",
      lavorazioniEffettuate: "",
      addettiAssegnati: [],
    };
  }
  const id = typeof raw.id === "string" && raw.id ? raw.id : `riga-${Date.now()}`;
  const dataLavorazione = typeof raw.dataLavorazione === "string" ? raw.dataLavorazione : "";
  const lavorazioniEffettuate =
    typeof raw.lavorazioniEffettuate === "string" ? raw.lavorazioniEffettuate : "";
  const addettiAssegnatiIn = raw.addettiAssegnati;
  if (Array.isArray(addettiAssegnatiIn)) {
    const addettiAssegnati: RigaAddettoOreScheda[] = addettiAssegnatiIn
      .filter(isRecord)
      .map((a) => ({
        addetto: typeof a.addetto === "string" ? a.addetto : "",
        oreImpiegate: typeof a.oreImpiegate === "number" && Number.isFinite(a.oreImpiegate) ? a.oreImpiegate : 0,
      }))
      .filter((a) => a.addetto.trim().length > 0 || a.oreImpiegate > 0);
    return { id, dataLavorazione, lavorazioniEffettuate, addettiAssegnati };
  }
  const legacyAddetto = typeof raw.addetto === "string" ? raw.addetto : "";
  let ore = 0;
  if (typeof raw.oreImpiegate === "number" && Number.isFinite(raw.oreImpiegate)) ore = raw.oreImpiegate;
  const addettiAssegnati: RigaAddettoOreScheda[] = [];
  if (legacyAddetto.trim() || ore > 0) {
    addettiAssegnati.push({ addetto: legacyAddetto, oreImpiegate: ore });
  }
  return { id, dataLavorazione, lavorazioniEffettuate, addettiAssegnati };
}

function normalizeLavorazioniDoc(doc: unknown): SchedaLavorazioniDoc | null {
  if (!isRecord(doc) || doc.tipo !== "lavorazioni") return null;
  const campi = doc.campi;
  if (!isRecord(campi)) return doc as SchedaLavorazioniDoc;
  const righeRaw = campi.righe;
  const righe = Array.isArray(righeRaw) ? righeRaw.map(normalizeRigaLavorazioneScheda) : [];
  return {
    ...(doc as SchedaLavorazioniDoc),
    campi: {
      identificazioneMacchina:
        typeof campi.identificazioneMacchina === "string" ? campi.identificazioneMacchina : "",
      righe,
    },
  };
}

export function normalizeSchedeBundle(bundle: LavorazioneSchedeBundle): LavorazioneSchedeBundle {
  const lav = bundle.lavorazioni ? normalizeLavorazioniDoc(bundle.lavorazioni) : null;
  return {
    ...bundle,
    lavorazioni: lav,
  };
}

export function migrateSchedeStore(store: LavorazioneSchedeStore): LavorazioneSchedeStore {
  const out: LavorazioneSchedeStore = {};
  for (const [k, b] of Object.entries(store)) {
    if (!b || typeof b !== "object") continue;
    out[k] = normalizeSchedeBundle(b as LavorazioneSchedeBundle);
  }
  return out;
}

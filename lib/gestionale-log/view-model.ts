import type { LavorazioniLogChange, LavorazioniLogEntry, LavorazioniLogTipo } from "@/lib/lavorazioni/lavorazioni-change-log";

export type GestionaleLogEventTone =
  | "create"
  | "update"
  | "delete"
  | "complete"
  | "archive"
  | "reopen"
  | "neutral";

export type GestionaleLogViewModel = {
  tone: GestionaleLogEventTone;
  /** Riga 1 — tipo modifica (MAIUSCOLO) */
  tipoRiga: string;
  /** Riga 2 — oggetto (es. Ricambio: … / Lavorazione: …) */
  oggettoRiga: string;
  /** Riga 3 — descrizione modifica (può contenere newline) */
  modificaRiga: string;
  autore: string;
  atIso: string;
};

export type CampoChangeLike = { campo: string; prima: string; dopo: string };

export type MagazzinoLogEntryLike = {
  tipo: "aggiunta" | "update" | "rimozione";
  ricambio: string;
  riepilogo: string;
  autore: string;
  at: string;
  changes: CampoChangeLike[];
};

export function gestionaleLogToneMagazzino(tipo: MagazzinoLogEntryLike["tipo"]): GestionaleLogEventTone {
  if (tipo === "aggiunta") return "create";
  if (tipo === "rimozione") return "delete";
  return "update";
}

export function gestionaleLogToneLavorazioni(tipo: LavorazioniLogTipo): GestionaleLogEventTone {
  switch (tipo) {
    case "creazione":
      return "create";
    case "eliminazione":
      return "delete";
    case "completata":
      return "complete";
    case "archiviazione":
      return "archive";
    case "riaperta":
      return "reopen";
    case "aggiornamento":
    default:
      return "update";
  }
}

export function formatGestionaleLogDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return safeStr(iso);
    return d.toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return safeStr(iso);
  }
}

export function formatGestionaleLogMetaLine(autore: string, iso: string): string {
  const a = formatLogAuthor(autore);
  return `${a} • ${formatGestionaleLogDateTime(iso)}`;
}

export function safeStr(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s);
}

/** Nome utente per riga 4: maiuscolo, mai vuoto. */
export function formatLogAuthor(name: string): string {
  const t = safeStr(name).trim();
  return t ? t.toUpperCase() : "SISTEMA";
}

/** Title case per parole (marche, nomi, stati generici). */
export function formatTitleCasePhrase(raw: string): string {
  const s = safeStr(raw).trim();
  if (!s || s === "—") return "—";
  return s
    .split(/\s+/)
    .map((w) => {
      if (!w) return w;
      const sub = w.split(/([\-/])/);
      return sub
        .map((part) => {
          if (part === "-" || part === "/") return part;
          if (!part) return part;
          if (/^[A-Z0-9]{2,}$/.test(part)) return part;
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join("");
    })
    .join(" ");
}

/** Stati lavorazioni / etichette in frase (es. "In Lavorazione"). */
export function formatStatoDisplay(raw: string): string {
  const s = safeStr(raw)
    .trim()
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");
  if (!s || s === "—") return "—";
  const lower = s.toLowerCase();
  const map: Record<string, string> = {
    "in lavorazione": "In Lavorazione",
    "da lavorare": "Da Lavorare",
    "attesa ricambi": "Attesa Ricambi",
    "attesa preventivo": "Attesa Preventivo",
    "accettazione": "Accettazione",
    "completata": "Completata",
    "in manutenzione": "In Manutenzione",
    "in collaudo": "In Collaudo",
  };
  if (map[lower]) return map[lower]!;
  return formatTitleCasePhrase(s);
}

function formatTargaDisplay(raw: string): string {
  const t = safeStr(raw).trim();
  if (!t || t === "—") return "—";
  return t.toUpperCase();
}

function sentenceForCampoChange(c: CampoChangeLike): string {
  const campo = safeStr(c.campo).trim();
  const p = safeStr(c.prima).trim() || "—";
  const d = safeStr(c.dopo).trim() || "—";

  if (campo === "Scorta") {
    const a = Number.parseInt(p, 10);
    const b = Number.parseInt(d, 10);
    if (!Number.isNaN(a) && !Number.isNaN(b)) {
      return `Scorta modificata da ${a} a ${b}`;
    }
    return `Scorta aggiornata da ${p} a ${d}`;
  }
  if (campo === "Stato") {
    return `Stato cambiato da ${formatStatoDisplay(p)} a ${formatStatoDisplay(d)}`;
  }
  if (campo === "Priorità") {
    return `Priorità modificata da ${formatTitleCasePhrase(p)} a ${formatTitleCasePhrase(d)}`;
  }
  if (campo === "Addetto") {
    return `Addetto modificato da ${formatTitleCasePhrase(p)} a ${formatTitleCasePhrase(d)}`;
  }
  if (campo === "Targa") {
    return `Targa modificata da ${formatTargaDisplay(p)} a ${formatTargaDisplay(d)}`;
  }
  if (campo === "Macchina" || campo === "Cliente" || campo === "Utilizzatore" || campo === "Matricola") {
    return `${campo}: aggiornato da ${formatTitleCasePhrase(p)} a ${formatTitleCasePhrase(d)}`;
  }
  if (campo === "Note" || campo === "Note interne") {
    return `Note aggiornate`;
  }
  if (campo.startsWith("Data ")) {
    return `${campo}: da ${p} a ${d}`;
  }
  if (campo === "Sincronizzazione") {
    return d !== "—" ? formatTitleCasePhrase(d) : "Dato anagrafica iniziale";
  }
  return `${campo} modificato da ${p} a ${d}`;
}

export function buildModificaRigaFromChanges(changes: CampoChangeLike[]): string {
  if (!changes.length) return "—";
  return changes.map(sentenceForCampoChange).join("\n");
}

/** Rimuove prefisso autore dal vecchio riepilogo (solo testo residuo). */
export function stripAutoreFromRiepilogo(riepilogo: string, autore: string): string {
  const r = safeStr(riepilogo).trim();
  const a = safeStr(autore).trim();
  if (!a) return r;
  const dash = `${a} — `;
  if (r.startsWith(dash)) return r.slice(dash.length).trim();
  try {
    const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^${escaped}\\s+ha\\s+`, "i");
    if (re.test(r)) return r.replace(re, "").trim();
  } catch {
    /* ignore */
  }
  return r;
}

function magazzinoTipoRiga(entry: MagazzinoLogEntryLike): string {
  if (entry.tipo === "aggiunta") return "CREAZIONE";
  if (entry.tipo === "rimozione") return "RIMOZIONE";
  const sc = entry.changes.find((c) => safeStr(c.campo).trim().toLowerCase() === "scorta");
  if (sc) {
    const a = Number.parseInt(safeStr(sc.prima).trim(), 10);
    const b = Number.parseInt(safeStr(sc.dopo).trim(), 10);
    if (!Number.isNaN(a) && !Number.isNaN(b)) {
      if (b > a) return "ENTRATA";
      if (b < a) return "USCITA";
    }
  }
  return "MODIFICA";
}

function magazzinoToneForEntry(entry: MagazzinoLogEntryLike): GestionaleLogEventTone {
  if (entry.tipo === "aggiunta") return "create";
  if (entry.tipo === "rimozione") return "delete";
  const label = magazzinoTipoRiga(entry);
  if (label === "ENTRATA") return "create";
  if (label === "USCITA") return "delete";
  return "update";
}

export type MezziLogEntryLike = {
  tipo: "aggiunta" | "update" | "rimozione";
  mezzo: string;
  riepilogo: string;
  autore: string;
  at: string;
  changes: CampoChangeLike[];
};

function mezziTipoRiga(tipo: MezziLogEntryLike["tipo"]): string {
  if (tipo === "aggiunta") return "CREAZIONE";
  if (tipo === "rimozione") return "RIMOZIONE";
  return "MODIFICA";
}

export function buildMezziGestionaleLogViewModel(entry: MezziLogEntryLike): GestionaleLogViewModel {
  const tone = gestionaleLogToneMagazzino(entry.tipo);
  const tipoRiga = mezziTipoRiga(entry.tipo);
  const oggettoRiga = `Mezzo: ${formatTitleCasePhrase(entry.mezzo)}`;
  let modificaRiga: string;
  if (entry.tipo === "aggiunta") {
    modificaRiga = "Nuovo mezzo registrato in anagrafica";
  } else if (entry.tipo === "rimozione") {
    modificaRiga = "Mezzo rimosso dall'anagrafica";
  } else if (entry.changes.length) {
    modificaRiga = entry.changes.map(sentenceForCampoChange).join("\n");
  } else {
    modificaRiga = stripAutoreFromRiepilogo(entry.riepilogo, entry.autore) || "—";
  }
  return {
    tone,
    tipoRiga,
    oggettoRiga,
    modificaRiga,
    autore: entry.autore,
    atIso: entry.at,
  };
}

export function buildMagazzinoGestionaleLogViewModel(entry: MagazzinoLogEntryLike): GestionaleLogViewModel {
  const tipoRiga = magazzinoTipoRiga(entry);
  const tone = magazzinoToneForEntry(entry);
  const oggettoRiga = `Ricambio: ${formatTitleCasePhrase(entry.ricambio)}`;

  let modificaRiga: string;
  if (entry.tipo === "aggiunta") {
    modificaRiga = "Nuovo articolo inserito in Magazzino";
  } else if (entry.tipo === "rimozione") {
    modificaRiga = "Articolo rimosso dal Magazzino";
  } else if (entry.changes.length) {
    modificaRiga = entry.changes.map(sentenceForCampoChange).join("\n");
  } else {
    const fb = stripAutoreFromRiepilogo(entry.riepilogo, entry.autore);
    modificaRiga = fb || "—";
  }

  return {
    tone,
    tipoRiga,
    oggettoRiga,
    modificaRiga,
    autore: entry.autore,
    atIso: entry.at,
  };
}

function lavorazioniTipoRiga(tipo: LavorazioniLogTipo): string {
  switch (tipo) {
    case "creazione":
      return "CREAZIONE";
    case "completata":
      return "COMPLETATA";
    case "archiviazione":
      return "ARCHIVIATA";
    case "eliminazione":
      return "ELIMINAZIONE";
    case "riaperta":
      return "RIAPERTA";
    case "aggiornamento":
    default:
      return "AGGIORNAMENTO";
  }
}

function formatLavorazioneOggettoLine(titolo: string): string {
  const t = safeStr(titolo).trim();
  if (!t) return "Lavorazione: —";
  const parts = t.split("—").map((x) => formatTitleCasePhrase(x.trim()));
  const inner = parts.join(" — ");
  return `Lavorazione: ${inner}`;
}

export function buildLavorazioniGestionaleLogViewModel(entry: LavorazioniLogEntry): GestionaleLogViewModel {
  const tone = gestionaleLogToneLavorazioni(entry.tipo);
  const tipoRiga = lavorazioniTipoRiga(entry.tipo);
  const schedaOggetto = safeStr(entry.schedaOggetto).trim();
  const oggettoRiga = schedaOggetto || formatLavorazioneOggettoLine(entry.titolo);

  let modificaRiga: string;
  if (entry.tipo === "creazione" && schedaOggetto) {
    modificaRiga = entry.riepilogo.trim() || "Scheda creata";
  } else if (entry.tipo === "creazione") {
    modificaRiga = "Nuova lavorazione registrata";
  } else if (entry.tipo === "archiviazione") {
    modificaRiga = "Spostata nello Storico";
  } else if (entry.tipo === "eliminazione" && schedaOggetto) {
    modificaRiga = entry.riepilogo.trim() || "Scheda eliminata";
  } else if (entry.changes.length) {
    modificaRiga = entry.changes.map(sentenceForCampoChange).join("\n");
  } else {
    const stripped = stripAutoreFromRiepilogo(entry.riepilogo, entry.autore);
    modificaRiga = stripped || "—";
  }

  return {
    tone,
    tipoRiga,
    oggettoRiga,
    modificaRiga,
    autore: entry.autore,
    atIso: entry.at,
  };
}

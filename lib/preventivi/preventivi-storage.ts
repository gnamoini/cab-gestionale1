import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import { dispatchPreventiviRefresh } from "@/lib/sistema/cab-events";
import { PREVENTIVI_MAX, PREVENTIVI_STORAGE_KEY } from "@/lib/preventivi/constants";
import { calcolaTotaliPreventivo } from "@/lib/preventivi/preventivi-totals";
import type { PreventivoManodopera, PreventivoRecord, PreventivoRigaRicambio, PreventivoStato } from "@/lib/preventivi/types";

function nextId(): string {
  return `prev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function hydratePreventivo(raw: unknown): PreventivoRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "string" || !id) return null;

  const righeIn = Array.isArray(o.righeRicambi) ? o.righeRicambi : [];
  const righeRicambi: PreventivoRigaRicambio[] = righeIn.map((rr: unknown) => {
    const r = rr as Record<string, unknown>;
    return {
      id: typeof r.id === "string" && r.id ? r.id : `prr-${Math.random().toString(36).slice(2, 9)}`,
      ricambioId: typeof r.ricambioId === "string" ? r.ricambioId : null,
      codiceOE: String(r.codiceOE ?? ""),
      descrizione: String(r.descrizione ?? ""),
      quantita: Math.max(0.01, Number(r.quantita) || 0),
      prezzoUnitario: Math.max(0, Number(r.prezzoUnitario) || 0),
      scontoPercent: Math.min(100, Math.max(0, Number(r.scontoPercent) || 0)),
    };
  });

  const m = (o.manodopera as Record<string, unknown>) || {};
  const addettiArr = Array.isArray(m.righeAddetti) ? m.righeAddetti : [];
  const righeAddetti = addettiArr
    .map((a: unknown) => {
      const x = a as Record<string, unknown>;
      return { addetto: String(x.addetto ?? "").trim(), ore: Number(x.ore) || 0 };
    })
    .filter((x) => x.addetto.length > 0);

  const manodopera: PreventivoManodopera = {
    oreTotali: Math.max(0, Number(m.oreTotali) || 0),
    righeAddetti: righeAddetti.length ? righeAddetti : [{ addetto: "Officina", ore: 1 }],
    costoOrario: Math.max(0, Number(m.costoOrario) || 0),
    scontoPercent: Math.min(100, Math.max(0, Number(m.scontoPercent) || 0)),
  };
  if (manodopera.oreTotali <= 0) {
    manodopera.oreTotali = Math.max(
      0.25,
      Math.round(manodopera.righeAddetti.reduce((s, x) => s + x.ore, 0) * 100) / 100,
    );
  }

  const statoRaw = String(o.stato ?? "bozza");
  const statiValidi: PreventivoStato[] = ["bozza", "inviato", "approvato", "rifiutato", "convertito"];
  const stato = (statiValidi.includes(statoRaw as PreventivoStato) ? statoRaw : "bozza") as PreventivoStato;

  const base: PreventivoRecord = {
    id,
    numero: String(o.numero ?? ""),
    dataCreazione: String(o.dataCreazione ?? new Date().toISOString()),
    aggiornatoAt: String(o.aggiornatoAt ?? new Date().toISOString()),
    stato,
    lavorazioneId: String(o.lavorazioneId ?? ""),
    lavorazioneOrigine: o.lavorazioneOrigine === "storico" ? "storico" : "attiva",
    cliente: String(o.cliente ?? ""),
    cantiere: String(o.cantiere ?? ""),
    utilizzatore: String(o.utilizzatore ?? ""),
    macchinaRiassunto: String(o.macchinaRiassunto ?? ""),
    targa: String(o.targa ?? ""),
    matricola: String(o.matricola ?? ""),
    nScuderia: String(o.nScuderia ?? ""),
    marcaAttrezzatura: String(o.marcaAttrezzatura ?? ""),
    modelloAttrezzatura: String(o.modelloAttrezzatura ?? ""),
    descrizioneLavorazioniCliente: String(o.descrizioneLavorazioniCliente ?? ""),
    descrizioneLavorazioniTecnicaSorgente: String(o.descrizioneLavorazioniTecnicaSorgente ?? ""),
    descrizioneGenerataAuto: String(o.descrizioneGenerataAuto ?? ""),
    righeRicambi,
    manodopera,
    noteFinali: String(o.noteFinali ?? ""),
    totaleRicambi: 0,
    totaleManodopera: 0,
    totaleFinale: 0,
    createdBy: String(o.createdBy ?? ""),
    lastEditedBy: String(o.lastEditedBy ?? ""),
  };
  return { ...base, ...calcolaTotaliPreventivo(base) };
}

export function nextPreventivoNumero(existing: PreventivoRecord[]): string {
  const y = new Date().getFullYear();
  let max = 0;
  for (const p of existing) {
    const t = p.numero.trim();
    const mNew = /^(\d{4})-(\d+)$/.exec(t);
    const mLegacy = /^PV-(\d{4})-(\d+)$/.exec(t);
    let seq: number | null = null;
    let year: string | null = null;
    if (mNew) {
      year = mNew[1]!;
      seq = parseInt(mNew[2]!, 10);
    } else if (mLegacy) {
      year = mLegacy[1]!;
      seq = parseInt(mLegacy[2]!, 10);
    }
    if (year === String(y) && seq !== null) max = Math.max(max, seq);
  }
  return `${y}-${String(max + 1).padStart(3, "0")}`;
}

export function loadPreventivi(): PreventivoRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PREVENTIVI_STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p
      .filter((x) => x && typeof x === "object")
      .slice(0, PREVENTIVI_MAX)
      .map((x) => hydratePreventivo(x))
      .filter((x): x is PreventivoRecord => x !== null);
  } catch {
    return [];
  }
}

export function savePreventivi(rows: PreventivoRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREVENTIVI_STORAGE_KEY, JSON.stringify(rows.slice(0, PREVENTIVI_MAX)));
    bumpReportDataRefresh();
  } catch {
    /* quota */
  }
}

export function appendPreventivo(row: PreventivoRecord): void {
  const prev = loadPreventivi();
  const hydrated = hydratePreventivo(row) ?? row;
  savePreventivi([hydrated, ...prev.filter((x) => x.id !== hydrated.id)]);
  dispatchPreventiviRefresh();
}

export function upsertPreventivo(row: PreventivoRecord): void {
  const prev = loadPreventivi();
  const hydrated = hydratePreventivo(row) ?? row;
  const i = prev.findIndex((x) => x.id === hydrated.id);
  const next = i >= 0 ? [...prev.slice(0, i), hydrated, ...prev.slice(i + 1)] : [hydrated, ...prev];
  savePreventivi(next);
  dispatchPreventiviRefresh();
}

export function deletePreventivo(id: string): void {
  savePreventivi(loadPreventivi().filter((x) => x.id !== id));
  dispatchPreventiviRefresh();
}

export function duplicatePreventivo(source: PreventivoRecord, autore: string): PreventivoRecord {
  const all = loadPreventivi();
  const now = new Date().toISOString();
  const numero = nextPreventivoNumero(all);
  const righeRicambi = source.righeRicambi.map((r) => ({
    ...r,
    scontoPercent: r.scontoPercent ?? 0,
  }));
  const manodopera: PreventivoManodopera = {
    ...source.manodopera,
    scontoPercent: source.manodopera.scontoPercent ?? 0,
  };
  const next: PreventivoRecord = {
    ...source,
    id: nextId(),
    numero,
    dataCreazione: now,
    aggiornatoAt: now,
    stato: "bozza",
    righeRicambi,
    manodopera,
    createdBy: autore,
    lastEditedBy: autore,
  };
  return { ...next, ...calcolaTotaliPreventivo(next) };
}

export function countPreventiviByLavorazioneId(): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of loadPreventivi()) {
    m.set(p.lavorazioneId, (m.get(p.lavorazioneId) ?? 0) + 1);
  }
  return m;
}

export { nextId as nextPreventivoId };

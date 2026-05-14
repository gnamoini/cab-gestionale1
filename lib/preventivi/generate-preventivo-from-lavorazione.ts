import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { inferEconomiciClientePreventivi } from "@/lib/preventivi/preventivi-cliente-infer";
import { nextPreventivoId, nextPreventivoNumero, loadPreventivi } from "@/lib/preventivi/preventivi-storage";
import { trasformaDescrizioneLavorazioni } from "@/lib/preventivi/trasforma-descrizione";
import { calcolaTotaliPreventivo } from "@/lib/preventivi/preventivi-totals";
import type { PreventivoManodopera, PreventivoRecord, PreventivoRigaRicambio } from "@/lib/preventivi/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneSchedeBundle } from "@/types/schede";

export function buildNewPreventivoFromLavorazioneContext(opts: {
  lav: LavorazioneAttiva | LavorazioneArchiviata;
  origine: "attiva" | "storico";
  bundle: LavorazioneSchedeBundle;
  mezzo: MezzoGestito | null;
  magazzino: RicambioMagazzino[];
  autore: string;
}): PreventivoRecord {
  const { lav, origine, bundle, magazzino, autore } = opts;
  const now = new Date().toISOString();
  const ing = bundle.ingresso?.campi ?? null;
  const lavScheda = bundle.lavorazioni?.tipo === "lavorazioni" ? bundle.lavorazioni : null;
  const ricScheda = bundle.ricambi?.tipo === "ricambi" ? bundle.ricambi : null;

  const cliente = (ing?.cliente?.trim() || lav.cliente).trim();
  const cantiere = (ing?.cantiere?.trim() || "").trim();
  const utilizzatore = (ing?.utilizzatore?.trim() || lav.utilizzatore).trim();
  const targa = (ing?.targa?.trim() || lav.targa).trim();
  const matricola = (ing?.matricola?.trim() || lav.matricola).trim();
  const nScuderia = (ing?.nScuderia?.trim() || lav.nScuderia?.trim() || opts.mezzo?.numeroScuderia || "").trim();
  const marcaAttrezzatura = (ing?.marcaAttrezzatura?.trim() || opts.mezzo?.marca || "").trim();
  const modelloAttrezzatura = (ing?.modelloAttrezzatura?.trim() || opts.mezzo?.modello || "").trim();
  const macchinaRiassunto = [marcaAttrezzatura, modelloAttrezzatura].filter(Boolean).join(" ").trim() || lav.macchina.trim();

  const techParts =
    lavScheda?.campi?.righe?.map((r) => r.lavorazioniEffettuate?.trim()).filter(Boolean) ?? ([] as string[]);
  const technicalBlob =
    techParts.join("\n").trim() || lav.noteInterne.trim() || "Intervento di manutenzione e controllo generale.";

  const codiciRicambi = (ricScheda?.campi.righe ?? []).map((r) => r.codice.trim()).filter(Boolean);
  const autoCliente = trasformaDescrizioneLavorazioni(technicalBlob, { targa, matricola, codiciRicambi });

  const righeRicambiRaw: PreventivoRigaRicambio[] = (ricScheda?.campi.righe ?? []).map((r) => {
    const mag = r.ricambioId ? magazzino.find((x) => x.id === r.ricambioId) : undefined;
    const prezzo = mag?.prezzoVendita ?? 0;
    const codiceOE = mag?.codiceFornitoreOriginale?.trim() || r.codice.trim();
    const desc = mag?.descrizione?.trim() || r.ricambioNome.trim();
    const q = Math.max(1, r.quantita || 1);
    return {
      id: `prr-${r.id}`,
      ricambioId: r.ricambioId,
      codiceOE: codiceOE || "—",
      descrizione: desc || "—",
      quantita: q,
      prezzoUnitario: Math.round(prezzo * 100) / 100,
      scontoPercent: 0,
    };
  });

  const tuttiPv = loadPreventivi();
  const infer = inferEconomiciClientePreventivi(cliente, tuttiPv);
  const righeRicambi: PreventivoRigaRicambio[] = righeRicambiRaw.map((r) => ({
    ...r,
    scontoPercent: infer.scontoRigaForCodice(r.codiceOE),
  }));

  const addMap = new Map<string, number>();
  for (const row of lavScheda?.campi.righe ?? []) {
    for (const a of row.addettiAssegnati ?? []) {
      const nom = a.addetto?.trim();
      if (!nom) continue;
      addMap.set(nom, (addMap.get(nom) ?? 0) + (Number.isFinite(a.oreImpiegate) ? a.oreImpiegate : 0));
    }
  }
  const righeAddetti: { addetto: string; ore: number }[] = [];
  for (const [addetto, ore] of addMap) {
    righeAddetti.push({ addetto, ore: Math.round(ore * 100) / 100 });
  }
  if (righeAddetti.length === 0 && lav.addetto?.trim()) {
    const guess = Math.max(1, Math.min(8, lavScheda?.campi.righe?.length ?? 2));
    righeAddetti.push({ addetto: lav.addetto.trim(), ore: guess });
  }
  if (righeAddetti.length === 0) {
    righeAddetti.push({ addetto: "Officina", ore: 1 });
  }
  const oreTotali = Math.max(0.25, Math.round(righeAddetti.reduce((s, x) => s + x.ore, 0) * 100) / 100);

  const manodopera: PreventivoManodopera = {
    oreTotali,
    righeAddetti,
    costoOrario: infer.costoOrario,
    scontoPercent: infer.manodoperaScontoPercent,
  };

  const noteFinali = infer.noteFinaliTipiche;

  const draft: PreventivoRecord = {
    id: nextPreventivoId(),
    numero: nextPreventivoNumero(tuttiPv),
    dataCreazione: now,
    aggiornatoAt: now,
    stato: "bozza",
    lavorazioneId: lav.id,
    lavorazioneOrigine: origine,
    cliente,
    cantiere,
    utilizzatore,
    macchinaRiassunto,
    targa,
    matricola,
    nScuderia,
    marcaAttrezzatura,
    modelloAttrezzatura,
    descrizioneLavorazioniCliente: autoCliente,
    descrizioneLavorazioniTecnicaSorgente: technicalBlob,
    descrizioneGenerataAuto: autoCliente,
    righeRicambi,
    manodopera,
    noteFinali,
    totaleRicambi: 0,
    totaleManodopera: 0,
    totaleFinale: 0,
    createdBy: autore,
    lastEditedBy: autore,
  };
  const tot = calcolaTotaliPreventivo(draft);
  return { ...draft, ...tot };
}

export { calcolaTotaliPreventivo } from "@/lib/preventivi/preventivi-totals";

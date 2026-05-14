import { meseCompletamentoFromIso } from "@/lib/lavorazioni/duration";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";

export function storicoToAttiva(s: LavorazioneArchiviata): LavorazioneAttiva {
  return {
    id: s.id,
    macchina: s.macchina,
    targa: s.targa,
    matricola: s.matricola,
    nScuderia: s.nScuderia,
    cliente: s.cliente,
    utilizzatore: s.utilizzatore,
    cantiere: s.cantiere,
    statoId: s.statoFinaleId,
    priorita: s.prioritaFinale,
    addetto: s.addetto,
    noteInterne: s.noteInterne,
    dataIngresso: s.dataIngresso,
    dataCompletamento: s.dataCompletamento,
  };
}

export function attivaToStoricoFromEdit(a: LavorazioneAttiva, prev: LavorazioneArchiviata): LavorazioneArchiviata {
  const fine = a.dataCompletamento ?? prev.dataCompletamento;
  return {
    ...prev,
    macchina: a.macchina,
    targa: a.targa,
    matricola: a.matricola,
    nScuderia: a.nScuderia,
    cliente: a.cliente,
    utilizzatore: a.utilizzatore,
    cantiere: a.cantiere,
    addetto: a.addetto,
    noteInterne: a.noteInterne,
    statoFinaleId: a.statoId,
    prioritaFinale: a.priorita,
    dataIngresso: a.dataIngresso,
    dataCompletamento: fine,
    meseCompletamento: fine ? meseCompletamentoFromIso(fine) : prev.meseCompletamento,
  };
}

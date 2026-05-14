import type {
  LavorazioneSchedeBundle,
  SchedaIngressoDoc,
  SchedaLavorazioniDoc,
  SchedaMeta,
  SchedaRicambiDoc,
  SchedaStatoUi,
  SchedaTipo,
} from "@/types/schede";

function statoSchedaDoc(doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc | null): SchedaStatoUi {
  if (!doc) return "mancante";
  if (doc.sorgente === "file_esterno") return "caricata";
  if (doc.updatedAt !== doc.createdAt) return "aggiornata";
  return "creata";
}

export function statoUiSchedaIngresso(b: LavorazioneSchedeBundle): SchedaStatoUi {
  return statoSchedaDoc(b.ingresso);
}

export function statoUiSchedaLavorazioni(b: LavorazioneSchedeBundle): SchedaStatoUi {
  return statoSchedaDoc(b.lavorazioni);
}

export function statoUiSchedaRicambi(b: LavorazioneSchedeBundle): SchedaStatoUi {
  return statoSchedaDoc(b.ricambi);
}

export function countSchedePresenti(b: LavorazioneSchedeBundle): number {
  let n = 0;
  if (b.ingresso) n += 1;
  if (b.lavorazioni) n += 1;
  if (b.ricambi) n += 1;
  return n;
}

export function newRigaId(): string {
  return `riga-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newSchedaMeta(tipo: SchedaTipo, user: string, sorgente: SchedaMeta["sorgente"] = "generata"): SchedaMeta {
  const now = new Date().toISOString();
  const u = user.trim() || "Operatore";
  return {
    tipo,
    sorgente,
    fileEsterno: null,
    createdAt: now,
    updatedAt: now,
    createdBy: u,
    updatedBy: u,
  };
}

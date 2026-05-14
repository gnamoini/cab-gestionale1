export { authService } from "@/src/services/auth.service";
export { mezziService } from "@/src/services/mezzi.service";
export { lavorazioniService, type LavorazioneListRow } from "@/src/services/lavorazioni.service";
export { schedeService } from "@/src/services/schede.service";
export { magazzinoService } from "@/src/services/magazzino.service";
export { movimentiService } from "@/src/services/movimenti.service";
export { preventiviInferTotaleDaDettagli, preventiviService } from "@/src/services/preventivi.service";
export { documentiService } from "@/src/services/documenti.service";
export { logService } from "@/src/services/log.service";
export type { ServiceResult } from "@/src/services/service-result";
export { success, err, error } from "@/src/services/service-result";
export type {
  ProfileRow,
  MezzoRow,
  LavorazioneRow,
  SchedaLavorazioneRow,
  MagazzinoRicambioRow,
  MovimentoRicambioRow,
  PreventivoRow,
  DocumentoRow,
  LogModificaRow,
} from "@/src/types/supabase-tables";

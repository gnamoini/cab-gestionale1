import type { CatalogMacchina, CatalogMarca } from "@/lib/mock-data/documenti";
import { mezziForMarcaModello } from "@/lib/documenti/documenti-catalog";
import {
  formatDocumentoRigaSintetica,
  labelApplicabilitaBreve,
  legacyAssocRefs,
  resolveDocumentoApplicazione,
} from "@/lib/documenti/documenti-applicabilita";
import type { DocumentoAssocRef, DocumentoGestionale, DocumentoTipoFile } from "@/lib/types/gestionale";
import type { MezzoGestito } from "@/lib/mezzi/types";

export function labelCategoria(c: DocumentoGestionale["categoria"]): string {
  switch (c) {
    case "listini":
      return "Listini";
    case "cataloghi":
      return "Cataloghi";
    case "manuali":
      return "Manuali";
    default:
      return "Altro";
  }
}

export function labelTipoFile(t: DocumentoTipoFile): string {
  switch (t) {
    case "pdf":
      return "PDF";
    case "immagine":
      return "Immagine";
    case "excel":
      return "Excel";
    case "word":
      return "Word";
    case "testo":
      return "Testo";
    default:
      return "Altro";
  }
}

export function inferTipoFileFromNome(nome: string): DocumentoTipoFile {
  const lower = nome.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(lower)) return "immagine";
  if (/\.(xlsx|xls)$/i.test(lower)) return "excel";
  if (/\.(doc|docx)$/i.test(lower)) return "word";
  if (/\.(txt|csv)$/i.test(lower)) return "testo";
  return "altro";
}

export function iconAbbrev(t: DocumentoTipoFile): string {
  switch (t) {
    case "pdf":
      return "PDF";
    case "immagine":
      return "IMG";
    case "excel":
      return "XLS";
    case "word":
      return "DOC";
    case "testo":
      return "TXT";
    default:
      return "FILE";
  }
}

export function getDocAssocRefs(doc: DocumentoGestionale, catalog: CatalogMarca[]): DocumentoAssocRef[] {
  return legacyAssocRefs(doc, catalog);
}

export function assocPairLabel(catalog: CatalogMarca[], ref: DocumentoAssocRef): string {
  const mar = catalog.find((m) => m.id === ref.marcaId);
  const mac = mar?.macchine.find((x) => x.id === ref.macchinaId);
  if (!mar || !mac) return "—";
  return `${mar.nome} ${mac.nome}`;
}

export function formatLinkedDestinations(
  doc: DocumentoGestionale,
  catalog: CatalogMarca[],
  exclude?: DocumentoAssocRef,
): string {
  const refs = getDocAssocRefs(doc, catalog);
  const labels = refs
    .filter((r) => !exclude || r.marcaId !== exclude.marcaId || r.macchinaId !== exclude.macchinaId)
    .map((r) => assocPairLabel(catalog, r));
  return labels.join(" · ");
}

export type DocumentiSortKey = "nome" | "marca" | "macchina" | "caricatoIl" | "categoria";
export type DocumentiSortPhase = "natural" | "asc" | "desc";

export function compareDocs(
  a: DocumentoGestionale,
  b: DocumentoGestionale,
  key: DocumentiSortKey | null,
  phase: DocumentiSortPhase,
): number {
  const ra = resolveDocumentoApplicazione(a);
  const rb = resolveDocumentoApplicazione(b);
  if (phase === "natural" || key === null) {
    const m = (ra.marcaKey ?? ra.marca).localeCompare(rb.marcaKey ?? rb.marca, "it");
    if (m !== 0) return m;
    const mac = (ra.modelloKey ?? ra.macchina).localeCompare(rb.modelloKey ?? rb.macchina, "it");
    if (mac !== 0) return mac;
    return a.nome.localeCompare(b.nome, "it");
  }
  const dir = phase === "asc" ? 1 : -1;
  switch (key) {
    case "nome":
      return a.nome.localeCompare(b.nome, "it") * dir;
    case "marca":
      return (ra.marcaKey ?? ra.marca).localeCompare(rb.marcaKey ?? rb.marca, "it") * dir;
    case "macchina":
      return (ra.modelloKey ?? ra.macchina).localeCompare(rb.modelloKey ?? rb.macchina, "it") * dir;
    case "caricatoIl":
      return (a.caricatoIl.localeCompare(b.caricatoIl, "it") || a.nome.localeCompare(b.nome, "it")) * dir;
    case "categoria":
      return (a.categoria.localeCompare(b.categoria, "it") || a.nome.localeCompare(b.nome, "it")) * dir;
    default:
      return 0;
  }
}

export type ArchiveDocMezzoNode = { mezzo: MezzoGestito; files: DocumentoGestionale[] };
export type ArchiveDocModelloNode = { modello: CatalogMacchina; files: DocumentoGestionale[]; mezzi: ArchiveDocMezzoNode[] };
export type ArchiveDocMarcaNode = { marca: CatalogMarca; filesMarca: DocumentoGestionale[]; modelli: ArchiveDocModelloNode[] };

/** Solo presentazione UI: listini di marca vs altri documenti con applicabilità «marca». */
export function partitionMarcaLevelDocs(filesMarca: DocumentoGestionale[]): {
  listini: DocumentoGestionale[];
  altriMarca: DocumentoGestionale[];
} {
  const listini = filesMarca.filter((d) => d.categoria === "listini");
  const altriMarca = filesMarca.filter((d) => d.categoria !== "listini");
  return { listini, altriMarca };
}

function sameMarca(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function sameModello(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * True se il documento ha un posto nell’albero (marca in catalogo da impostazioni/mezzi e, se serve, modello o mezzo coerente).
 * I documenti che restano fuori vanno mostrati nella sezione “senza collocazione”.
 */
export function documentoCollocatoInCatalogo(
  doc: DocumentoGestionale,
  catalog: CatalogMarca[],
  mezzi: MezzoGestito[],
): boolean {
  const r = resolveDocumentoApplicazione(doc);
  const marcaNome = (r.marcaKey ?? r.marca).trim();
  const mar = catalog.find((m) => sameMarca(m.nome, marcaNome));
  if (!mar) return false;
  if (r.applicabilita === "marca") return true;
  const modNome = (r.modelloKey ?? r.macchina).trim();
  if (r.applicabilita === "modello") {
    if (!modNome || modNome === "—") return false;
    return mar.macchine.some((mac) => sameModello(mac.nome, modNome));
  }
  if (r.applicabilita === "macchina") {
    const id = r.mezzoId?.trim();
    if (!id) return false;
    const mz = mezzi.find((z) => z.id === id);
    if (!mz) return false;
    if (!sameMarca(mz.marca, marcaNome)) return false;
    return mar.macchine.some((mac) => sameModello(mac.nome, mz.modello));
  }
  return false;
}

/** Albero: marca → (documenti globali marca) → modello → (documenti modello) → mezzo → (documenti macchina). */
export function buildDocumentiViewTree(
  catalog: CatalogMarca[],
  mezzi: MezzoGestito[],
  sortedDocs: DocumentoGestionale[],
  sortColumn: DocumentiSortKey | null,
  sortPhase: DocumentiSortPhase,
): ArchiveDocMarcaNode[] {
  const out: ArchiveDocMarcaNode[] = [];
  for (const marca of catalog) {
    const filesMarca: DocumentoGestionale[] = [];
    const modelli: ArchiveDocModelloNode[] = [];

    for (const d of sortedDocs) {
      const r = resolveDocumentoApplicazione(d);
      if (r.applicabilita === "marca" && sameMarca(r.marcaKey ?? r.marca, marca.nome)) filesMarca.push(d);
    }
    filesMarca.sort((a, b) => compareDocs(a, b, sortColumn, sortPhase));

    for (const mac of marca.macchine) {
      const filesModello: DocumentoGestionale[] = [];
      for (const d of sortedDocs) {
        const r = resolveDocumentoApplicazione(d);
        if (r.applicabilita !== "modello") continue;
        if (!sameMarca(r.marcaKey ?? r.marca, marca.nome)) continue;
        if (!sameModello(r.modelloKey ?? r.macchina, mac.nome)) continue;
        filesModello.push(d);
      }
      filesModello.sort((a, b) => compareDocs(a, b, sortColumn, sortPhase));

      const mezziList = mezziForMarcaModello(mezzi, marca.nome, mac.nome);
      const mezziNodes: ArchiveDocMezzoNode[] = mezziList.map((mz) => {
        const files: DocumentoGestionale[] = [];
        for (const d of sortedDocs) {
          const r = resolveDocumentoApplicazione(d);
          if (r.applicabilita !== "macchina") continue;
          if (r.mezzoId && r.mezzoId === mz.id) files.push(d);
        }
        files.sort((a, b) => compareDocs(a, b, sortColumn, sortPhase));
        return { mezzo: mz, files };
      });

      if (filesModello.length > 0 || mezziList.length > 0) {
        modelli.push({
          modello: mac,
          files: filesModello,
          mezzi: mezziNodes,
        });
      }
    }

    if (filesMarca.length === 0 && modelli.length === 0) continue;
    out.push({ marca, filesMarca, modelli });
  }
  return out;
}

export function docMatchesFilters(
  doc: DocumentoGestionale,
  catalog: CatalogMarca[],
  opts: {
    filtroMarca: string;
    filtroModello: string;
    filtroMezzoId: string;
    filtroCategoria: DocumentoGestionale["categoria"] | "__tutti__";
    filtroTipo: DocumentoTipoFile | "__tutti__";
  },
): boolean {
  const r = resolveDocumentoApplicazione(doc);

  if (opts.filtroCategoria !== "__tutti__" && doc.categoria !== opts.filtroCategoria) return false;
  if (opts.filtroTipo !== "__tutti__" && doc.tipoFile !== opts.filtroTipo) return false;

  if (opts.filtroMarca !== "__tutti__") {
    const mar = catalog.find((m) => m.id === opts.filtroMarca);
    if (!mar || !sameMarca(r.marcaKey ?? r.marca, mar.nome)) return false;
  }
  if (opts.filtroModello !== "__tutti__") {
    const mar = opts.filtroMarca !== "__tutti__" ? catalog.find((m) => m.id === opts.filtroMarca) : null;
    const modelliScope = mar?.macchine ?? catalog.flatMap((m) => m.macchine);
    const mac = modelliScope.find((x) => x.id === opts.filtroModello);
    if (!mac || !sameModello(r.modelloKey ?? r.macchina, mac.nome)) return false;
  }
  if (opts.filtroMezzoId !== "__tutti__") {
    if (r.applicabilita !== "macchina" || r.mezzoId !== opts.filtroMezzoId) return false;
  }
  return true;
}

export function docMatchesSearch(doc: DocumentoGestionale, catalog: CatalogMarca[], q: string): boolean {
  if (!q) return true;
  const r = resolveDocumentoApplicazione(doc);
  const assocText = getDocAssocRefs(doc, catalog)
    .map((ref) => assocPairLabel(catalog, ref))
    .join(" ");
  const hay = [
    doc.nome,
    r.marcaKey ?? r.marca,
    r.modelloKey ?? r.macchina,
    r.mezzoId ?? "",
    labelCategoria(doc.categoria),
    labelTipoFile(doc.tipoFile),
    labelApplicabilitaBreve(r.applicabilita!),
    formatDocumentoRigaSintetica(doc),
    doc.note ?? "",
    assocText,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function getDocumentApriHref(doc: DocumentoGestionale): string | null {
  const blob = doc.urlBlob?.trim();
  if (blob && /^blob:/i.test(blob)) return blob;
  const ext = doc.urlDocumento?.trim();
  if (ext && /^https?:\/\//i.test(ext)) return ext;
  return null;
}

export function extractFileExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  if (i <= 0 || i === fileName.length - 1) return "";
  return fileName.slice(i).toLowerCase();
}

export function pairKey(ref: DocumentoAssocRef): string {
  return `${ref.marcaId}||${ref.macchinaId}`;
}

export function parsePairKey(key: string): DocumentoAssocRef | null {
  const parts = key.split("||");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { marcaId: parts[0]!, macchinaId: parts[1]! };
}

export { formatDocumentoRigaSintetica, labelApplicabilitaBreve, resolveDocumentoApplicazione };

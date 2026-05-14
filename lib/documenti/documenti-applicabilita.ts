import type { CatalogMarca } from "@/lib/mock-data/documenti";
import type { DocumentoAssocRef, DocumentoGestionale, DocumentoApplicabilita } from "@/lib/types/gestionale";

export function allowedApplicabilitaForCategoria(
  c: DocumentoGestionale["categoria"],
): DocumentoApplicabilita[] {
  switch (c) {
    case "listini":
      return ["marca"];
    case "cataloghi":
      return ["marca", "modello"];
    case "manuali":
      return ["modello", "macchina"];
    default:
      return ["marca", "modello", "macchina"];
  }
}

export function defaultApplicabilitaForCategoria(c: DocumentoGestionale["categoria"]): DocumentoApplicabilita {
  const a = allowedApplicabilitaForCategoria(c);
  return a[0]!;
}

/** Risolve applicabilità e chiavi testuali (marca / modello) con fallback legacy. */
export function resolveDocumentoApplicazione(doc: DocumentoGestionale, catalog?: CatalogMarca[]): DocumentoGestionale {
  if (doc.applicabilita && doc.marcaKey?.trim()) {
    const mk = doc.marcaKey.trim();
    const mod = doc.modelloKey?.trim() ?? "";
    return {
      ...doc,
      applicabilita: doc.applicabilita,
      marcaKey: mk,
      modelloKey: doc.applicabilita === "marca" ? undefined : mod || undefined,
      mezzoId: doc.applicabilita === "macchina" ? doc.mezzoId?.trim() || undefined : undefined,
      marca: mk,
      macchina: doc.applicabilita === "marca" ? "—" : mod || doc.macchina,
    };
  }

  const marcaNome = doc.marca?.trim() || "";
  const modelloLegacy = doc.macchina?.trim() || "";

  if (doc.categoria === "listini") {
    return {
      ...doc,
      applicabilita: "marca",
      marcaKey: marcaNome,
      modelloKey: undefined,
      mezzoId: undefined,
      marca: marcaNome,
      macchina: "—",
    };
  }

  if (doc.categoria === "cataloghi") {
    const hasModel = modelloLegacy.length > 0 && modelloLegacy !== "—";
    if (hasModel) {
      return {
        ...doc,
        applicabilita: "modello",
        marcaKey: marcaNome,
        modelloKey: modelloLegacy,
        mezzoId: undefined,
        marca: marcaNome,
        macchina: modelloLegacy,
      };
    }
    return {
      ...doc,
      applicabilita: "marca",
      marcaKey: marcaNome,
      modelloKey: undefined,
      mezzoId: undefined,
      marca: marcaNome,
      macchina: "—",
    };
  }

  if (doc.categoria === "manuali") {
    return {
      ...doc,
      applicabilita: "modello",
      marcaKey: marcaNome,
      modelloKey: modelloLegacy || marcaNome,
      mezzoId: undefined,
      marca: marcaNome,
      macchina: modelloLegacy || "—",
    };
  }

  const hasAssoc = doc.associazioni && doc.associazioni.length > 0 && catalog?.length;
  if (hasAssoc && catalog) {
    const first = doc.associazioni![0]!;
    const mar = catalog.find((m) => m.id === first.marcaId);
    const mac = mar?.macchine.find((x) => x.id === first.macchinaId);
    if (mar && mac) {
      return {
        ...doc,
        applicabilita: doc.associazioni!.length > 1 ? "modello" : "modello",
        marcaKey: mar.nome,
        modelloKey: mac.nome,
        mezzoId: undefined,
        marca: mar.nome,
        macchina: mac.nome,
      };
    }
  }

  return {
    ...doc,
    applicabilita: "modello",
    marcaKey: marcaNome || "—",
    modelloKey: modelloLegacy || "—",
    mezzoId: undefined,
  };
}

export function labelApplicabilitaBreve(a: DocumentoApplicabilita): string {
  switch (a) {
    case "marca":
      return "MARCA";
    case "modello":
      return "MODELLO";
    case "macchina":
      return "MACCHINA";
    default:
      return a;
  }
}

/** Riga sintetica tipo "LISTINO — MERCEDES" o "MANUALE — MERCEDES ACTROS". */
export function formatDocumentoRigaSintetica(doc: DocumentoGestionale): string {
  const cat =
    doc.categoria === "listini"
      ? "LISTINO"
      : doc.categoria === "cataloghi"
        ? "CATALOGO"
        : doc.categoria === "manuali"
          ? "MANUALE"
          : "ALTRO";
  const r = resolveDocumentoApplicazione(doc);
  const m = r.marcaKey?.trim() || r.marca.trim();
  if (r.applicabilita === "marca") return `${cat} — ${m}`;
  if (r.applicabilita === "modello") {
    const mod = r.modelloKey?.trim() || r.macchina.trim();
    return `${cat} — ${m} ${mod}`.replace(/\s+/g, " ").trim();
  }
  const mezzo = r.mezzoId ? ` · mezzo ${r.mezzoId}` : "";
  const mod = r.modelloKey?.trim() || r.macchina.trim();
  return `${cat} — ${m} ${mod}${mezzo}`.replace(/\s+/g, " ").trim();
}

export function legacyAssocRefs(doc: DocumentoGestionale, catalog: CatalogMarca[]): DocumentoAssocRef[] {
  if (doc.associazioni && doc.associazioni.length > 0) return doc.associazioni;
  const mar = catalog.find((m) => m.nome === doc.marca);
  if (!mar) return [];
  const mac = mar.macchine.find((x) => x.nome === doc.macchina);
  if (!mac) return [];
  return [{ marcaId: mar.id, macchinaId: mac.id }];
}

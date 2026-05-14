"use client";

import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { CatalogMarca } from "@/lib/mock-data/documenti";
import { mezziForMarcaModello } from "@/lib/documenti/documenti-catalog";
import {
  allowedApplicabilitaForCategoria,
  defaultApplicabilitaForCategoria,
} from "@/lib/documenti/documenti-applicabilita";
import type { DocumentoGestionale, DocumentoTipoFile, DocumentoApplicabilita } from "@/lib/types/gestionale";
import { erpBtnAccent, erpBtnNeutral, FilterSelectWrap, selectLavorazioniFilter } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { useAuth } from "@/context/auth-context";
import {
  extractFileExtension,
  formatDocumentoRigaSintetica,
  getDocumentApriHref,
  inferTipoFileFromNome,
  labelCategoria,
  labelTipoFile,
  resolveDocumentoApplicazione,
} from "@/components/gestionale/documenti/documenti-helpers";
import type { MezzoGestito } from "@/lib/mezzi/types";

const inputClass =
  "w-full rounded-lg border border-zinc-600/90 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 shadow-md shadow-black/20 outline-none transition placeholder:text-zinc-500 focus:border-orange-500/75 focus:ring-2 focus:ring-orange-400/30";

const CATEGORIE: DocumentoGestionale["categoria"][] = ["listini", "cataloghi", "manuali", "altro"];
const TIPI_FILE: DocumentoTipoFile[] = ["pdf", "immagine", "excel", "word", "testo", "altro"];

function sameTextNorm(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function DocumentiModalShell({
  title,
  children,
  onRequestClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onRequestClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const sb = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    const prevOverflow = document.body.style.overflow;
    const prevPr = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (sb > 0) document.body.style.paddingRight = `${sb}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPr;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onRequestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRequestClose]);

  const widthClass = wide ? "max-w-lg" : "max-w-md";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onRequestClose();
        }
      }}
    >
      <div
        className={`relative z-[1] flex max-h-[min(92dvh,880px)] w-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 ${widthClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="documenti-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 id="documenti-modal-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          <button type="button" onClick={onRequestClose} className={erpBtnNeutral} aria-label="Chiudi">
            Chiudi
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="mt-1 text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function previewNomeFile(nome: string, applicabilita: DocumentoApplicabilita, marca: string, modello: string, mezzo?: MezzoGestito | null) {
  const cat = nome.trim() || "documento";
  const m = marca.trim() || "—";
  if (applicabilita === "marca") return `${cat} · ${m} (tutta la marca)`;
  const mod = modello.trim() || "—";
  if (applicabilita === "modello") return `${cat} · ${m} ${mod}`;
  const id = mezzo ? `${mezzo.targa || "—"} / ${mezzo.matricola || "—"}` : "mezzo";
  return `${cat} · ${m} ${mod} · ${id}`;
}

export function UploadDocumentoModal({
  catalog,
  mezzi,
  onRequestClose,
  onSubmit,
}: {
  catalog: CatalogMarca[];
  mezzi: MezzoGestito[];
  onRequestClose: () => void;
  onSubmit: (payload: Omit<DocumentoGestionale, "id">) => void;
}) {
  const { authorName } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const pickedFileRef = useRef<File | null>(null);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<DocumentoGestionale["categoria"]>("manuali");
  const [applicabilita, setApplicabilita] = useState<DocumentoApplicabilita>(() => defaultApplicabilitaForCategoria("manuali"));
  const [marcaId, setMarcaId] = useState(() => catalog[0]?.id ?? "");
  const [modelloId, setModelloId] = useState(() => catalog[0]?.macchine[0]?.id ?? "");
  const [mezzoId, setMezzoId] = useState("__nessuno__");
  const [note, setNote] = useState("");
  const [pickedName, setPickedName] = useState<string>("");
  const [pickedSizeKb, setPickedSizeKb] = useState<number>(0);

  const marcaSel = useMemo(() => catalog.find((m) => m.id === marcaId) ?? catalog[0] ?? null, [catalog, marcaId]);
  const modelliOpts = marcaSel?.macchine ?? [];
  const mezziOpts = useMemo(() => {
    if (!marcaSel) return [];
    const mac = modelliOpts.find((x) => x.id === modelloId);
    if (!mac) return [];
    return mezziForMarcaModello(mezzi, marcaSel.nome, mac.nome);
  }, [marcaSel, modelliOpts, modelloId, mezzi]);

  useEffect(() => {
    const allowed = allowedApplicabilitaForCategoria(categoria);
    if (!allowed.includes(applicabilita)) setApplicabilita(allowed[0]!);
  }, [categoria, applicabilita]);

  useEffect(() => {
    if (!marcaSel) return;
    if (!modelliOpts.some((x) => x.id === modelloId)) setModelloId(modelliOpts[0]?.id ?? "");
  }, [marcaSel, modelliOpts, modelloId]);

  useEffect(() => {
    if (applicabilita !== "macchina") return;
    if (mezzoId !== "__nessuno__" && !mezziOpts.some((z) => z.id === mezzoId)) setMezzoId(mezziOpts[0]?.id ?? "__nessuno__");
  }, [applicabilita, mezziOpts, mezzoId]);

  function onFileChange(f: File | null) {
    pickedFileRef.current = f;
    if (!f) {
      setPickedName("");
      setPickedSizeKb(0);
      return;
    }
    setPickedName(f.name);
    setPickedSizeKb(Math.max(1, Math.round(f.size / 1024)));
    if (!nome.trim()) setNome(f.name);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    const file = pickedFileRef.current;
    if (!n || !file || !marcaSel) return;
    if (applicabilita === "macchina" && (mezzoId === "__nessuno__" || !mezziOpts.find((z) => z.id === mezzoId))) return;

    const mac = modelliOpts.find((x) => x.id === modelloId);
    const mezzo = applicabilita === "macchina" ? mezziOpts.find((z) => z.id === mezzoId) ?? null : null;

    const tipo = inferTipoFileFromNome(n);
    const today = new Date().toISOString().slice(0, 10);
    const urlBlob = URL.createObjectURL(file);
    const ext = extractFileExtension(file.name);
    pickedFileRef.current = null;

    const base: Omit<DocumentoGestionale, "id"> = {
      nome: n,
      categoria,
      marca: marcaSel.nome,
      macchina: applicabilita === "marca" ? "—" : mac?.nome ?? "—",
      tipoFile: tipo,
      autoreCaricamento: authorName,
      note: note.trim() || undefined,
      caricatoIl: today,
      ultimaModifica: today,
      dimensioneKb: Math.max(1, Math.round(file.size / 1024)),
      urlBlob,
      fileEstensione: ext || undefined,
      applicabilita,
      marcaKey: marcaSel.nome,
      modelloKey: applicabilita === "marca" ? undefined : mac?.nome,
      mezzoId: applicabilita === "macchina" ? mezzo?.id : undefined,
      associazioni: undefined,
    };
    const tmp = { ...base, id: "__new__" } as DocumentoGestionale;
    const resolved = resolveDocumentoApplicazione(tmp);
    const { id: _drop, ...payload } = resolved;
    onSubmit(payload as Omit<DocumentoGestionale, "id">);
    onRequestClose();
  }

  const mezzoSel = applicabilita === "macchina" ? mezziOpts.find((z) => z.id === mezzoId) ?? null : null;
  const macSel = modelliOpts.find((x) => x.id === modelloId) ?? null;

  return (
    <DocumentiModalShell title="Carica documento" onRequestClose={onRequestClose} wide>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="lavorazioni-scroll-scope min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Nome file
            <input className={`${inputClass} mt-1`} value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Tipo documento
            <FilterSelectWrap>
              <select
                className={selectLavorazioniFilter}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as DocumentoGestionale["categoria"])}
              >
                {CATEGORIE.map((c) => (
                  <option key={c} value={c}>
                    {labelCategoria(c)}
                  </option>
                ))}
              </select>
            </FilterSelectWrap>
          </label>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Applicabilità
            <FilterSelectWrap>
              <select
                className={selectLavorazioniFilter}
                value={applicabilita}
                onChange={(e) => setApplicabilita(e.target.value as DocumentoApplicabilita)}
              >
                {allowedApplicabilitaForCategoria(categoria).map((a) => (
                  <option key={a} value={a}>
                    {a === "marca" ? "Intera marca" : a === "modello" ? "Modello specifico" : "Macchina (targa / matricola)"}
                  </option>
                ))}
              </select>
            </FilterSelectWrap>
          </label>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Marca
            <FilterSelectWrap>
              <select className={selectLavorazioniFilter} value={marcaId} onChange={(e) => setMarcaId(e.target.value)}>
                {catalog.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </FilterSelectWrap>
          </label>
          {applicabilita !== "marca" ? (
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Modello
              <FilterSelectWrap>
                <select className={selectLavorazioniFilter} value={modelloId} onChange={(e) => setModelloId(e.target.value)}>
                  {modelliOpts.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </FilterSelectWrap>
            </label>
          ) : null}
          {applicabilita === "macchina" ? (
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Macchina (anagrafica mezzi)
              <FilterSelectWrap>
                <select className={selectLavorazioniFilter} value={mezzoId} onChange={(e) => setMezzoId(e.target.value)}>
                  <option value="__nessuno__">— Seleziona —</option>
                  {mezziOpts.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.targa || "—"} · {z.matricola || "—"}
                      {z.numeroScuderia ? ` · sc. ${z.numeroScuderia}` : ""}
                    </option>
                  ))}
                </select>
              </FilterSelectWrap>
            </label>
          ) : null}
          <p className="rounded-lg border border-zinc-700/50 bg-zinc-950/30 px-3 py-2 text-[11px] text-zinc-400">
            Anteprima:{" "}
            <span className="font-medium text-zinc-200">
              {previewNomeFile(nome || pickedName || "file", applicabilita, marcaSel?.nome ?? "", macSel?.nome ?? "", mezzoSel)}
            </span>
          </p>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Note (facoltative)
            <textarea className={`${inputClass} mt-1 min-h-[72px] resize-y`} value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </label>
          <div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
            <button type="button" className={erpBtnNeutral} onClick={() => fileRef.current?.click()}>
              Scegli file dal computer…
            </button>
            {pickedName ? (
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                Selezionato: <span className="font-medium text-zinc-900 dark:text-zinc-100">{pickedName}</span> ({pickedSizeKb} KB)
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-zinc-500">PDF, Word, Excel, PNG, JPG.</p>
            )}
          </div>
        </div>
        <div className="shrink-0 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="submit"
            className={`${erpBtnAccent} w-full`}
            disabled={
              !pickedName.trim() ||
              !marcaSel ||
              (applicabilita !== "marca" && !macSel) ||
              (applicabilita === "macchina" && (mezzoId === "__nessuno__" || mezziOpts.length === 0))
            }
          >
            Conferma caricamento
          </button>
        </div>
      </form>
    </DocumentiModalShell>
  );
}

export function DocumentoInfoModal({
  doc,
  catalog,
  onRequestClose,
  onEdit,
}: {
  doc: DocumentoGestionale;
  catalog: CatalogMarca[];
  onRequestClose: () => void;
  onEdit: () => void;
}) {
  const r = resolveDocumentoApplicazione(doc);
  const openHref = getDocumentApriHref(doc);
  const entita =
    r.applicabilita === "marca"
      ? r.marcaKey ?? r.marca
      : r.applicabilita === "modello"
        ? `${r.marcaKey ?? r.marca} · ${r.modelloKey ?? r.macchina}`
        : `${r.marcaKey ?? r.marca} · ${r.modelloKey ?? r.macchina} · mezzo ${r.mezzoId ?? "—"}`;

  return (
    <DocumentiModalShell title="Dettaglio documento" onRequestClose={onRequestClose} wide>
      <div className="lavorazioni-scroll-scope flex max-h-[min(80dvh,640px)] flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 text-sm">
          <InfoRow label="Riepilogo" value={<span className="font-semibold">{formatDocumentoRigaSintetica(doc)}</span>} />
          <InfoRow label="Nome file" value={doc.nome} />
          <InfoRow
            label="Apri file"
            value={
              openHref ? (
                <a
                  href={openHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-orange-600 underline decoration-orange-400/50 underline-offset-2 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                >
                  Apri in nuova scheda
                </a>
              ) : (
                "—"
              )
            }
          />
          <InfoRow label="Tipo file" value={labelTipoFile(doc.tipoFile)} />
          <InfoRow label="Tipo documento" value={labelCategoria(doc.categoria)} />
          <InfoRow label="Applicabilità" value={r.applicabilita === "marca" ? "MARCA (globale)" : r.applicabilita === "modello" ? "MODELLO" : "MACCHINA"} />
          <InfoRow label="Entità collegata" value={entita} />
          <InfoRow label="Data caricamento" value={doc.caricatoIl} />
          <InfoRow label="Ultima modifica" value={doc.ultimaModifica} />
          <InfoRow label="Autore" value={doc.autoreCaricamento} />
          <InfoRow label="Note" value={doc.note?.trim() ? doc.note : "—"} />
          <InfoRow label="Dimensione" value={`${doc.dimensioneKb} KB`} />
        </div>
        <div className="shrink-0 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="button" className={`${erpBtnAccent} w-full`} onClick={onEdit}>
            Modifica
          </button>
        </div>
      </div>
    </DocumentiModalShell>
  );
}

export function DocumentoEditModal({
  doc,
  catalog,
  mezzi,
  onRequestClose,
  onSave,
}: {
  doc: DocumentoGestionale;
  catalog: CatalogMarca[];
  mezzi: MezzoGestito[];
  onRequestClose: () => void;
  onSave: (next: DocumentoGestionale) => void;
}) {
  const { authorName } = useAuth();
  const r0 = resolveDocumentoApplicazione(doc);
  const [nome, setNome] = useState(doc.nome);
  const [categoria, setCategoria] = useState(doc.categoria);
  const [applicabilita, setApplicabilita] = useState<DocumentoApplicabilita>(r0.applicabilita!);
  const initialMarca = catalog.find((m) => sameTextNorm(m.nome, r0.marcaKey ?? r0.marca))?.id ?? catalog[0]?.id ?? "";
  const [marcaId, setMarcaId] = useState(initialMarca);
  const marcaSel = catalog.find((m) => m.id === marcaId) ?? catalog[0] ?? null;
  const modelliOpts = marcaSel?.macchine ?? [];
  const initialModello =
    modelliOpts.find((x) => sameTextNorm(x.nome, r0.modelloKey ?? r0.macchina))?.id ?? modelliOpts[0]?.id ?? "";
  const [modelloId, setModelloId] = useState(initialModello);
  const mezziOpts = useMemo(() => {
    if (!marcaSel) return [];
    const mac = modelliOpts.find((x) => x.id === modelloId);
    if (!mac) return [];
    return mezziForMarcaModello(mezzi, marcaSel.nome, mac.nome);
  }, [marcaSel, modelliOpts, modelloId, mezzi]);
  const [mezzoId, setMezzoId] = useState(r0.mezzoId && r0.applicabilita === "macchina" ? r0.mezzoId : "__nessuno__");
  const [tipoFile, setTipoFile] = useState<DocumentoTipoFile>(doc.tipoFile);
  const [note, setNote] = useState(doc.note ?? "");
  const [autore, setAutore] = useState(doc.autoreCaricamento);

  useEffect(() => {
    const allowed = allowedApplicabilitaForCategoria(categoria);
    if (!allowed.includes(applicabilita)) setApplicabilita(allowed[0]!);
  }, [categoria, applicabilita]);

  useEffect(() => {
    if (!marcaSel) return;
    if (!modelliOpts.some((x) => x.id === modelloId)) setModelloId(modelliOpts[0]?.id ?? "");
  }, [marcaSel, modelliOpts, modelloId]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!marcaSel) return;
    const mac = modelliOpts.find((x) => x.id === modelloId);
    if (applicabilita !== "marca" && !mac) return;
    if (applicabilita === "macchina" && (mezzoId === "__nessuno__" || !mezziOpts.find((z) => z.id === mezzoId))) return;

    const mezzo = applicabilita === "macchina" ? mezziOpts.find((z) => z.id === mezzoId) ?? null : null;
    const today = new Date().toISOString().slice(0, 10);
    const base: DocumentoGestionale = {
      ...doc,
      nome: nome.trim(),
      categoria,
      marca: marcaSel.nome,
      macchina: applicabilita === "marca" ? "—" : mac?.nome ?? doc.macchina,
      tipoFile,
      note: note.trim() || undefined,
      autoreCaricamento: autore.trim() || doc.autoreCaricamento || authorName,
      ultimaModifica: today,
      applicabilita,
      marcaKey: marcaSel.nome,
      modelloKey: applicabilita === "marca" ? undefined : mac?.nome,
      mezzoId: applicabilita === "macchina" ? mezzo?.id : undefined,
      associazioni: undefined,
    };
    onSave(resolveDocumentoApplicazione(base));
    onRequestClose();
  }

  return (
    <DocumentiModalShell title="Modifica documento" onRequestClose={onRequestClose} wide>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="lavorazioni-scroll-scope min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Nome file
            <input className={`${inputClass} mt-1`} value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Tipo documento
            <FilterSelectWrap>
              <select className={selectLavorazioniFilter} value={categoria} onChange={(e) => setCategoria(e.target.value as DocumentoGestionale["categoria"])}>
                {CATEGORIE.map((c) => (
                  <option key={c} value={c}>
                    {labelCategoria(c)}
                  </option>
                ))}
              </select>
            </FilterSelectWrap>
          </label>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Applicabilità
            <FilterSelectWrap>
              <select className={selectLavorazioniFilter} value={applicabilita} onChange={(e) => setApplicabilita(e.target.value as DocumentoApplicabilita)}>
                {allowedApplicabilitaForCategoria(categoria).map((a) => (
                  <option key={a} value={a}>
                    {a === "marca" ? "Intera marca" : a === "modello" ? "Modello specifico" : "Macchina (targa / matricola)"}
                  </option>
                ))}
              </select>
            </FilterSelectWrap>
          </label>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Marca
            <FilterSelectWrap>
              <select className={selectLavorazioniFilter} value={marcaId} onChange={(e) => setMarcaId(e.target.value)}>
                {catalog.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </FilterSelectWrap>
          </label>
          {applicabilita !== "marca" ? (
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Modello
              <FilterSelectWrap>
                <select className={selectLavorazioniFilter} value={modelloId} onChange={(e) => setModelloId(e.target.value)}>
                  {modelliOpts.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </FilterSelectWrap>
            </label>
          ) : null}
          {applicabilita === "macchina" ? (
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Macchina
              <FilterSelectWrap>
                <select className={selectLavorazioniFilter} value={mezzoId} onChange={(e) => setMezzoId(e.target.value)}>
                  <option value="__nessuno__">— Seleziona —</option>
                  {mezziOpts.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.targa || "—"} · {z.matricola || "—"}
                    </option>
                  ))}
                </select>
              </FilterSelectWrap>
            </label>
          ) : null}
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Tipo file
            <FilterSelectWrap>
              <select className={selectLavorazioniFilter} value={tipoFile} onChange={(e) => setTipoFile(e.target.value as DocumentoTipoFile)}>
                {TIPI_FILE.map((t) => (
                  <option key={t} value={t}>
                    {labelTipoFile(t)}
                  </option>
                ))}
              </select>
            </FilterSelectWrap>
          </label>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Autore caricamento
            <input className={`${inputClass} mt-1`} value={autore} onChange={(e) => setAutore(e.target.value)} />
          </label>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Note
            <textarea className={`${inputClass} mt-1 min-h-[72px] resize-y`} value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </label>
        </div>
        <div className="shrink-0 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="submit" className={`${erpBtnAccent} w-full`} disabled={!marcaSel || (applicabilita !== "marca" && !modelliOpts.find((x) => x.id === modelloId))}>
            Salva modifiche
          </button>
        </div>
      </form>
    </DocumentiModalShell>
  );
}

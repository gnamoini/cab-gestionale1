"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { LavorazioneAttiva, PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { addettoDisplayColor } from "@/lib/lavorazioni/addetto-colors-assign";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import {
  isoToItDisplay,
  parseItalianDayToIso,
  parseOptionalItalianDayToIso,
} from "@/lib/lavorazioni/date-day-only";
import { LavorazioniDateField } from "@/components/gestionale/lavorazioni/lavorazioni-date-field";
import { LavorazioneMezzoPicker } from "@/components/gestionale/lavorazioni/lavorazione-mezzo-picker";
import { LavorazioniModalSelect } from "@/components/gestionale/lavorazioni/lavorazioni-modal-select";
import { AddettiSettingsList, ColorSwatchButton, StatoSettingsList } from "@/components/gestionale/lavorazioni/lavorazioni-settings-ui";
import {
  erpBtnAccent,
  erpBtnNeutral,
  erpBtnSoftOrange,
  prioritaBadgeStyle,
  prioritaLabel,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  dsInput,
  dsLavorazioniModalDialog,
  dsLavorazioniModalLayer,
  dsLavorazioniModalOverlay,
  dsLabel,
} from "@/lib/ui/design-system";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text)]">{children}</p>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={dsLabel}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const PRIORITA: PrioritaLav[] = ["alta", "media", "bassa"];

/** Scroll lock con scrollbar gutter; chiusura solo overlay (mousedown) o ESC. */
export function LavorazioniModalShell({
  children,
  wide,
  maxWidthClass,
  onRequestClose,
}: {
  children: React.ReactNode;
  wide?: boolean;
  /** Es. max-w-3xl — se assente con `wide` usa max-w-2xl. */
  maxWidthClass?: string;
  onRequestClose: () => void;
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

  return (
    <div className={dsLavorazioniModalLayer} role="presentation">
      <button
        type="button"
        className={dsLavorazioniModalOverlay}
        aria-label="Chiudi finestra"
        onMouseDown={(e) => {
          e.preventDefault();
          onRequestClose();
        }}
      />
      <div
        className={`${dsLavorazioniModalDialog} ${maxWidthClass ?? (wide ? "max-w-2xl" : "max-w-lg")}`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

export function EditLavorazioneModal({
  title,
  initial,
  stati,
  addetti,
  addettoColors,
  prioritaColors,
  onCommit,
  onRequestClose,
}: {
  title: string;
  initial: LavorazioneAttiva;
  stati: StatoLavorazioneConfig[];
  addetti: string[];
  addettoColors: Record<string, string>;
  /** Colori priorità da preferenze (opzionale). */
  prioritaColors?: Partial<Record<PrioritaLav, string>> | null;
  onCommit: (next: LavorazioneAttiva) => void;
  onRequestClose: () => void;
}) {
  const [local, setLocal] = useState<LavorazioneAttiva>(() => initial);
  const [dataIngressoText, setDataIngressoText] = useState(() => isoToItDisplay(initial.dataIngresso));
  const [dataUscitaText, setDataUscitaText] = useState(() =>
    initial.dataCompletamento ? isoToItDisplay(initial.dataCompletamento) : "",
  );
  const [dateErr, setDateErr] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const inOk = parseItalianDayToIso(dataIngressoText);
    if (!inOk.ok) {
      setDateErr("Data ingresso non valida. Usa gg/mm/aaaa (es. 10/05/2026) oppure aaaa-mm-gg.");
      return;
    }
    const uscOk = parseOptionalItalianDayToIso(dataUscitaText);
    if (!uscOk.ok) {
      setDateErr("Data uscita non valida.");
      return;
    }
    setDateErr(null);
    onCommit({
      ...local,
      dataIngresso: inOk.iso,
      dataCompletamento: uscOk.iso,
    });
  }

  return (
    <LavorazioniModalShell wide onRequestClose={onRequestClose}>
      <div className="flex shrink-0 items-center border-b border-[color:var(--cab-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[color:var(--cab-text)]">{title}</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <SectionTitle>Mezzo</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-12">
                <Field label="Macchina">
                  <input
                    className={dsInput}
                    value={local.macchina}
                    onChange={(e) => setLocal({ ...local, macchina: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="Targa">
                  <input
                    className={`${dsInput} font-mono text-xs`}
                    value={local.targa}
                    onChange={(e) => setLocal({ ...local, targa: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="Matricola">
                  <input
                    className={`${dsInput} font-mono text-xs`}
                    value={local.matricola}
                    onChange={(e) => setLocal({ ...local, matricola: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="N. scuderia">
                  <input
                    className={`${dsInput} font-mono text-xs`}
                    value={local.nScuderia}
                    onChange={(e) => setLocal({ ...local, nScuderia: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <SectionTitle>Committente e utilizzo</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <Field label="Cliente">
                  <input
                    className={dsInput}
                    value={local.cliente}
                    onChange={(e) => setLocal({ ...local, cliente: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <div className="sm:col-span-6">
                <Field label="Utilizzatore finale">
                  <input
                    className={dsInput}
                    value={local.utilizzatore}
                    onChange={(e) => setLocal({ ...local, utilizzatore: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <div className="sm:col-span-12">
                <Field label="Cantiere">
                  <input
                    className={dsInput}
                    value={local.cantiere ?? ""}
                    onChange={(e) => setLocal({ ...local, cantiere: e.target.value })}
                    placeholder="Opzionale"
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <SectionTitle>Gestione intervento</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <Field label="Stato">
                  <LavorazioniModalSelect
                    ariaLabel="Stato lavorazione"
                    value={local.statoId}
                    onChange={(v) => setLocal({ ...local, statoId: v })}
                    accentHex={statoDisplayColor(local.statoId, stati)}
                  >
                    {stati.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </LavorazioniModalSelect>
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="Priorità">
                  <LavorazioniModalSelect
                    ariaLabel="Priorità"
                    value={local.priorita}
                    onChange={(v) => setLocal({ ...local, priorita: v as PrioritaLav })}
                  >
                    {PRIORITA.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </LavorazioniModalSelect>
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="Addetto">
                  <LavorazioniModalSelect
                    ariaLabel="Addetto"
                    value={local.addetto}
                    onChange={(v) => setLocal({ ...local, addetto: v })}
                  >
                    {addetti.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </LavorazioniModalSelect>
                </Field>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <SectionTitle>Pianificazione</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <Field label="Data ingresso">
                  <LavorazioniDateField
                    value={dataIngressoText}
                    onChange={(v) => {
                      setDataIngressoText(v);
                      setDateErr(null);
                    }}
                    inputClassName={dsInput}
                    required
                  />
                </Field>
              </div>
              <div className="sm:col-span-6">
                <Field label="Data uscita (opz.)">
                  <LavorazioniDateField
                    value={dataUscitaText}
                    onChange={(v) => {
                      setDataUscitaText(v);
                      setDateErr(null);
                    }}
                    inputClassName={dsInput}
                    placeholder="vuoto se non applicabile"
                  />
                </Field>
              </div>
            </div>
            {dateErr ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{dateErr}</p> : null}
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Solo giorno (senza orario). Digita gg/mm/aaaa o aaaa-mm-gg, oppure apri il calendario. Controlli al salvataggio.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <SectionTitle>Note interne</SectionTitle>
            <textarea
              className={`${dsInput} min-h-[88px] resize-y`}
              value={local.noteInterne}
              onChange={(e) => setLocal({ ...local, noteInterne: e.target.value })}
              rows={4}
            />
          </div>
        </div>
        <div className="shrink-0 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="submit" className={`${erpBtnAccent} w-full`}>
            Salva modifiche
          </button>
        </div>
      </form>
    </LavorazioniModalShell>
  );
}

export function NewLavorazioneModal({
  draft,
  setDraft,
  mezzi,
  stati,
  addetti,
  addettoColors,
  prioritaColors,
  onSave,
  onRequestClose,
}: {
  draft: LavorazioneAttiva;
  setDraft: (next: Partial<LavorazioneAttiva>) => void;
  mezzi: MezzoGestito[];
  stati: StatoLavorazioneConfig[];
  addetti: string[];
  addettoColors: Record<string, string>;
  prioritaColors?: Partial<Record<PrioritaLav, string>> | null;
  onSave: (row: LavorazioneAttiva) => void;
  onRequestClose: () => void;
}) {
  const d = draft;
  const [ingressoText, setIngressoText] = useState(() => isoToItDisplay(d.dataIngresso));
  const [dateErr, setDateErr] = useState<string | null>(null);

  useEffect(() => {
    setIngressoText(isoToItDisplay(d.dataIngresso));
  }, [d.dataIngresso]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const inOk = parseItalianDayToIso(ingressoText);
    if (!inOk.ok) {
      setDateErr("Data ingresso non valida. Usa gg/mm/aaaa (es. 10/05/2026) oppure aaaa-mm-gg.");
      return;
    }
    setDateErr(null);
    onSave({ ...d, dataIngresso: inOk.iso });
  }

  return (
    <LavorazioniModalShell wide onRequestClose={onRequestClose}>
      <div className="flex shrink-0 items-center border-b border-[color:var(--cab-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[color:var(--cab-text)]">Nuova lavorazione</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <SectionTitle>Mezzo</SectionTitle>
            <LavorazioneMezzoPicker mezzi={mezzi} draft={d} setDraft={setDraft} />
            <div className="mt-4 grid gap-3">
              <Field label="Macchina">
                <input
                  className={dsInput}
                  value={d.macchina}
                  onChange={(e) => setDraft({ ...d, macchina: e.target.value })}
                  required
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Targa">
                  <input
                    className={`${dsInput} font-mono text-xs`}
                    value={d.targa}
                    onChange={(e) => setDraft({ ...d, targa: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Matricola">
                  <input
                    className={`${dsInput} font-mono text-xs`}
                    value={d.matricola}
                    onChange={(e) => setDraft({ ...d, matricola: e.target.value })}
                    required
                  />
                </Field>
                <Field label="N. scuderia">
                  <input
                    className={`${dsInput} font-mono text-xs`}
                    value={d.nScuderia}
                    onChange={(e) => setDraft({ ...d, nScuderia: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <SectionTitle>Committente e utilizzo</SectionTitle>
            <div className="grid gap-3">
              <Field label="Cliente">
                <input
                  className={dsInput}
                  value={d.cliente}
                  onChange={(e) => setDraft({ ...d, cliente: e.target.value })}
                  required
                />
              </Field>
              <Field label="Utilizzatore finale">
                <input
                  className={dsInput}
                  value={d.utilizzatore}
                  onChange={(e) => setDraft({ ...d, utilizzatore: e.target.value })}
                  required
                />
              </Field>
              <Field label="Cantiere">
                <input
                  className={dsInput}
                  value={d.cantiere ?? ""}
                  onChange={(e) => setDraft({ ...d, cantiere: e.target.value })}
                  placeholder="Opzionale"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <SectionTitle>Gestione intervento</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Stato iniziale">
                <LavorazioniModalSelect
                  ariaLabel="Stato iniziale"
                  value={d.statoId}
                  onChange={(v) => setDraft({ statoId: v })}
                  accentHex={statoDisplayColor(d.statoId, stati)}
                >
                  {stati.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </LavorazioniModalSelect>
              </Field>
              <Field label="Priorità">
                <LavorazioniModalSelect
                  ariaLabel="Priorità"
                  value={d.priorita}
                  onChange={(v) => setDraft({ priorita: v as PrioritaLav })}
                >
                  {PRIORITA.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </LavorazioniModalSelect>
              </Field>
              <Field label="Addetto">
                <LavorazioniModalSelect
                  ariaLabel="Addetto"
                  value={d.addetto}
                  onChange={(v) => setDraft({ addetto: v })}
                >
                  {addetti.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </LavorazioniModalSelect>
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <SectionTitle>Tempi e note</SectionTitle>
            <div className="grid gap-3">
              <Field label="Data ingresso">
                <LavorazioniDateField
                  value={ingressoText}
                  onChange={(v) => {
                    setIngressoText(v);
                    setDateErr(null);
                  }}
                  inputClassName={dsInput}
                  required
                />
              </Field>
              {dateErr ? <p className="text-xs text-red-600 dark:text-red-400">{dateErr}</p> : null}
              <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Solo giorno (senza orario). Digita gg/mm/aaaa o aaaa-mm-gg, oppure apri il calendario.
              </p>
              <Field label="Note">
                <textarea
                  className={`${dsInput} min-h-[72px] resize-y`}
                  value={d.noteInterne}
                  onChange={(e) => setDraft({ ...d, noteInterne: e.target.value })}
                  rows={3}
                />
              </Field>
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button type="submit" className={`${erpBtnAccent} w-full`}>
            Crea lavorazione
          </button>
        </div>
      </form>
    </LavorazioniModalShell>
  );
}

type SettingsTab = "stati" | "priorita" | "addetti";

export type SettingsLavorazioniTab = SettingsTab;

export function SettingsLavorazioniModal({
  stati,
  onAddStato,
  onChangeStatoLabel,
  onChangeStatoColor,
  onRemoveStato,
  addetti,
  addettoColors,
  prioritaColors,
  onChangePrioritaColor,
  onAddAddetto,
  onRenameAddettoBlur,
  onChangeAddettoColor,
  onRemoveAddetto,
  attiviStatoIds,
  storicoStatoIds,
  attiviAddetti,
  storicoAddetti,
  onRequestClose,
  layout = "modal",
  /** Con `layout="embedded"`: mostra solo il pannello indicato (senza tab interni). */
  embeddedFocus = null,
}: {
  stati: StatoLavorazioneConfig[];
  onAddStato: (label: string) => void;
  onChangeStatoLabel: (id: string, label: string) => void;
  onChangeStatoColor: (id: string, hex: string) => void;
  onRemoveStato: (id: string) => void;
  addetti: string[];
  addettoColors: Record<string, string>;
  prioritaColors: Partial<Record<PrioritaLav, string>>;
  onChangePrioritaColor: (p: PrioritaLav, hex: string) => void;
  onAddAddetto: (name: string) => void;
  onRenameAddettoBlur: (previousName: string, nextName: string) => void;
  onChangeAddettoColor: (nome: string, hex: string) => void;
  onRemoveAddetto: (name: string) => void;
  attiviStatoIds: Set<string>;
  storicoStatoIds: Set<string>;
  attiviAddetti: Set<string>;
  storicoAddetti: Set<string>;
  onRequestClose: () => void;
  /** `embedded`: solo contenuto (senza shell modale) per annidamento in «Impostazioni sistema». */
  layout?: "modal" | "embedded";
  embeddedFocus?: SettingsLavorazioniTab | null;
}) {
  const [tab, setTab] = useState<SettingsTab>("stati");
  const [nuovoStato, setNuovoStato] = useState("");
  const [nuovoAddetto, setNuovoAddetto] = useState("");

  const lockedTab = layout === "embedded" && embeddedFocus ? embeddedFocus : null;

  useEffect(() => {
    if (lockedTab) setTab(lockedTab);
  }, [lockedTab]);

  const tabBtn = (id: SettingsTab, label: string) => {
    const active = tab === id;
    return (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={active}
        className={`rounded-lg px-3 py-2 text-xs font-semibold transition-[background-color,color,box-shadow] duration-150 ${
          active
            ? "bg-orange-500 text-white shadow-sm shadow-orange-500/25 ring-1 ring-orange-400/40 dark:bg-orange-600 dark:ring-orange-500/35"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/90"
        }`}
        onClick={() => setTab(id)}
      >
        {label}
      </button>
    );
  };

  const inner = (
      <div
        className={`flex min-h-0 w-full min-w-0 flex-col ${
          lockedTab ? "max-h-none min-h-0 flex-1 overflow-hidden" : "max-h-[min(88dvh,820px)] overflow-hidden"
        }`}
      >
        <header className="shrink-0 border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_92%,var(--cab-card))] px-4 py-3">
          <h2 id="lavorazioni-settings-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {lockedTab === "stati"
              ? "Stati lavorazioni"
              : lockedTab === "priorita"
                ? "Priorità"
                : lockedTab === "addetti"
                  ? "Addetti"
                  : "Impostazioni Lavorazioni"}
          </h2>
        </header>

        {!lockedTab ? (
          <div
            role="tablist"
            aria-labelledby="lavorazioni-settings-title"
            className="flex shrink-0 flex-wrap gap-1 border-b border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-2"
          >
            {tabBtn("stati", "Stati lavorazione")}
            {tabBtn("priorita", "Priorità")}
            {tabBtn("addetti", "Addetti")}
          </div>
        ) : null}

        <div
          role="tabpanel"
          aria-label={tab === "stati" ? "Stati lavorazione" : tab === "priorita" ? "Priorità" : "Addetti"}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-zinc-50/50 p-4 dark:bg-zinc-950/50 [scrollbar-gutter:stable]"
        >
          {tab === "stati" ? (
            <div className="mx-auto max-w-xl rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <input
                  className={`${dsInput} min-w-0 flex-1 sm:max-w-md`}
                  placeholder="Nuovo stato"
                  value={nuovoStato}
                  onChange={(e) => setNuovoStato(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const label = nuovoStato.trim();
                      if (!label) return;
                      onAddStato(label);
                      setNuovoStato("");
                    }
                  }}
                />
                <button
                  type="button"
                  className={erpBtnSoftOrange}
                  onClick={() => {
                    const label = nuovoStato.trim();
                    if (!label) return;
                    onAddStato(label);
                    setNuovoStato("");
                  }}
                >
                  Aggiungi stato
                </button>
              </div>
              <StatoSettingsList
                stati={stati}
                onChangeLabel={onChangeStatoLabel}
                onChangeStatoColor={onChangeStatoColor}
                onRemove={onRemoveStato}
                attiviStatoIds={attiviStatoIds}
                storicoStatoIds={storicoStatoIds}
                inputClass={dsInput}
              />
            </div>
          ) : null}

          {tab === "priorita" ? (
            <div className="mx-auto max-w-xl rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {PRIORITA.map((p) => {
                  const hex = prioritaDisplayColor(p, prioritaColors);
                  return (
                    <li key={p} className="flex min-h-[2.75rem] flex-wrap items-center gap-2 py-2.5 first:pt-0 last:pb-0">
                      <span className="min-w-0 flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        {prioritaLabel(p)}
                      </span>
                      <span
                        className="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-black/10"
                        style={prioritaBadgeStyle(hex)}
                      >
                        {prioritaLabel(p)}
                      </span>
                      <ColorSwatchButton
                        value={hex}
                        ariaLabel={`Colore priorità ${prioritaLabel(p)}`}
                        onChange={(h) => onChangePrioritaColor(p, h)}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {tab === "addetti" ? (
            <div className="mx-auto max-w-xl rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <input
                  className={`${dsInput} min-w-0 flex-1 sm:max-w-md`}
                  placeholder="Nuovo addetto"
                  value={nuovoAddetto}
                  onChange={(e) => setNuovoAddetto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const name = nuovoAddetto.trim();
                      if (!name) return;
                      onAddAddetto(name);
                      setNuovoAddetto("");
                    }
                  }}
                />
                <button
                  type="button"
                  className={erpBtnSoftOrange}
                  onClick={() => {
                    const name = nuovoAddetto.trim();
                    if (!name) return;
                    onAddAddetto(name);
                    setNuovoAddetto("");
                  }}
                >
                  Aggiungi addetto
                </button>
              </div>
              <AddettiSettingsList
                addetti={addetti}
                addettoColors={addettoColors}
                onChangeAddettoColor={onChangeAddettoColor}
                onRenameBlur={onRenameAddettoBlur}
                onRemove={onRemoveAddetto}
                attiviAddetti={attiviAddetti}
                storicoAddetti={storicoAddetti}
                inputClass={dsInput}
              />
            </div>
          ) : null}
        </div>

        {layout === "modal" ? (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <button type="button" className={erpBtnNeutral} onClick={onRequestClose}>
              Chiudi
            </button>
          </footer>
        ) : null}
      </div>
  );

  if (layout === "embedded") {
    return inner;
  }

  return (
    <LavorazioniModalShell wide maxWidthClass="max-w-3xl" onRequestClose={onRequestClose}>
      {inner}
    </LavorazioniModalShell>
  );
}

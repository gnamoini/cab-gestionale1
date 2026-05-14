"use client";

import { useMemo, useState } from "react";
import { gestionaleSelectNativePlainClass } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { MagazzinoPrezziLineari } from "@/components/gestionale/magazzino/magazzino-prezzi-lineari";
import type { RicambioFormState } from "@/lib/magazzino/form";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  compatLabelMarcaModello,
  flattenCompatDaAttrezzature,
  migrateMezziListePrefs,
  modelliVisibiliPerMarca,
} from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  clampMarkupPercentuale,
  normalizeMarkupInputString,
  parseCompatInput,
  syncPrezzoVenditaInForm,
} from "@/lib/magazzino/form";

const inputBase =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-orange-500/25 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950";

/** Nasconde frecce native del browser su input numerici (stepper custom solo scorta). */
const noSpinner =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const stepperBtnMinus =
  "flex h-9 w-9 shrink-0 cursor-pointer select-none items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-800 shadow-sm outline-none transition-[background-color,border-color,box-shadow] duration-150 hover:border-zinc-300 hover:bg-zinc-100 hover:shadow-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-orange-400/55 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 active:bg-zinc-200/90 dark:active:bg-zinc-600 [-webkit-tap-highlight-color:transparent]";

const stepperBtnPlus =
  "flex h-9 w-9 shrink-0 cursor-pointer select-none items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-800 shadow-sm outline-none transition-[background-color,border-color,box-shadow] duration-150 hover:border-orange-200/90 hover:bg-orange-50/95 hover:shadow-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-orange-800/60 dark:hover:bg-orange-950/50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-orange-400/55 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 active:bg-orange-100/90 dark:active:bg-orange-950/70 [-webkit-tap-highlight-color:transparent]";

function StockStepper({
  value,
  onChange,
  onDelta,
  groupLabel,
  ariaDecrease,
  ariaIncrease,
  inputClass,
}: {
  value: string;
  onChange: (v: string) => void;
  onDelta: (d: number) => void;
  /** Evita &lt;label&gt; che raggruppa più controlli (hover/focus incrociati) */
  groupLabel: string;
  ariaDecrease: string;
  ariaIncrease: string;
  inputClass: string;
}) {
  return (
    <div role="group" aria-label={groupLabel} className="flex items-stretch gap-1">
      <button
        type="button"
        className={stepperBtnMinus}
        aria-label={ariaDecrease}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onDelta(-1);
        }}
      >
        −
      </button>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} min-w-0 flex-1 text-center font-mono tabular-nums`}
      />
      <button
        type="button"
        className={stepperBtnPlus}
        aria-label={ariaIncrease}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onDelta(1);
        }}
      >
        +
      </button>
    </div>
  );
}

export function RicambioField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

type SetForm = React.Dispatch<React.SetStateAction<RicambioFormState>>;

function mergeOptions(base: string[], current: string): string[] {
  const s = new Set(base);
  if (current.trim()) s.add(current.trim());
  return Array.from(s).sort((a, b) => a.localeCompare(b, "it"));
}

export function RicambioFormFields({
  form,
  setForm,
  marcheOptions,
  categorieOptions,
  mezziOptions,
  attrezzatureListe,
  codiceOriginaleAvvisoDuplicato,
  relaxHtmlValidation = false,
}: {
  form: RicambioFormState;
  setForm: SetForm;
  marcheOptions: string[];
  categorieOptions: string[];
  mezziOptions: string[];
  attrezzatureListe: MezziListePrefs;
  /** Avviso sotto il campo codice OE (es. nuovo ricambio con codice già in archivio) */
  codiceOriginaleAvvisoDuplicato?: { existing: RicambioMagazzino; onVaiAlRicambio: () => void } | null;
  /** Se true: nessun `required` HTML (submit gestito lato applicazione). */
  relaxHtmlValidation?: boolean;
}) {
  const [filtroMarcaCompat, setFiltroMarcaCompat] = useState("__tutti__");
  const prefsTree = useMemo(() => migrateMezziListePrefs(attrezzatureListe), [attrezzatureListe]);
  const marcheAttrezzatura = useMemo(() => [...prefsTree.marche], [prefsTree.marche]);
  const lineeCompatFiltrate = useMemo(() => {
    if (filtroMarcaCompat === "__tutti__") return flattenCompatDaAttrezzature(prefsTree);
    return modelliVisibiliPerMarca(prefsTree, filtroMarcaCompat).map((mod) => compatLabelMarcaModello(filtroMarcaCompat, mod));
  }, [prefsTree, filtroMarcaCompat]);
  const marcaOpts = useMemo(() => mergeOptions(marcheOptions, form.marca), [marcheOptions, form.marca]);
  const catOpts = useMemo(() => mergeOptions(categorieOptions, form.categoria), [categorieOptions, form.categoria]);
  const mezziSel = useMemo(() => new Set(parseCompatInput(form.compatibilitaMezzi)), [form.compatibilitaMezzi]);
  const mezziOptsSorted = useMemo(
    () =>
      [...new Set([...mezziOptions, ...lineeCompatFiltrate, ...parseCompatInput(form.compatibilitaMezzi)])].sort((a, b) =>
        a.localeCompare(b, "it"),
      ),
    [mezziOptions, lineeCompatFiltrate, form.compatibilitaMezzi],
  );

  function toggleMezzo(m: string) {
    setForm((f) => {
      const cur = new Set(parseCompatInput(f.compatibilitaMezzi));
      if (cur.has(m)) cur.delete(m);
      else cur.add(m);
      const joined = Array.from(cur).sort((a, b) => a.localeCompare(b, "it")).join(", ");
      return { ...f, compatibilitaMezzi: joined };
    });
  }

  function bumpScorta(field: "scorta" | "scortaMinima", delta: number) {
    setForm((f) => {
      const raw = field === "scorta" ? f.scorta : f.scortaMinima;
      const n = Math.max(0, Math.round(parseFloat(raw) || 0) + delta);
      return { ...f, [field]: String(n) };
    });
  }

  const previewLineari = useMemo(() => {
    const listinoOE = Math.max(0, parseFloat(form.prezzoFornitoreOriginale) || 0);
    const scontoOE = Math.min(100, Math.max(0, parseFloat(form.scontoFornitoreOriginale) || 0));
    const listinoAlt = Math.max(0, parseFloat(form.prezzoFornitoreNonOriginale) || 0);
    const scontoAlt = Math.min(100, Math.max(0, parseFloat(form.scontoFornitoreNonOriginale) || 0));
    const markupPct = clampMarkupPercentuale(parseFloat(String(form.markupPercentuale).replace(",", ".")) || 0);
    const prezzoVendita = Math.max(0, parseFloat(String(form.prezzoVendita).replace(",", ".")) || 0);
    return { listinoOE, scontoOE, listinoAlt, scontoAlt, markupPct, prezzoVendita };
  }, [
    form.prezzoFornitoreOriginale,
    form.scontoFornitoreOriginale,
    form.prezzoFornitoreNonOriginale,
    form.scontoFornitoreNonOriginale,
    form.markupPercentuale,
    form.prezzoVendita,
  ]);

  return (
    <div className="flex flex-col gap-3">
      <RicambioField label="Marca *">
        <select
          required={!relaxHtmlValidation}
          value={form.marca}
          onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
          className={gestionaleSelectNativePlainClass}
        >
          <option value="" disabled={!relaxHtmlValidation}>
            Seleziona marca
          </option>
          {marcaOpts.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </RicambioField>
      <RicambioField label="Codice fornitore originale *">
        <input
          required={!relaxHtmlValidation}
          value={form.codiceFornitoreOriginale}
          onChange={(e) => setForm((f) => ({ ...f, codiceFornitoreOriginale: e.target.value }))}
          className={`${inputBase} font-mono font-semibold tracking-wide ${
            codiceOriginaleAvvisoDuplicato
              ? "border-amber-400/90 ring-1 ring-amber-400/35 dark:border-amber-600 dark:ring-amber-600/30"
              : ""
          }`}
          aria-invalid={codiceOriginaleAvvisoDuplicato ? true : undefined}
        />
        {codiceOriginaleAvvisoDuplicato ? (
          <div
            className="mt-2 rounded-lg border border-amber-200/95 bg-amber-50/95 p-3 shadow-sm dark:border-amber-800/55 dark:bg-amber-950/35"
            role="alert"
          >
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">Codice già presente in magazzino</p>
            <dl className="mt-2 space-y-1 text-xs text-amber-950/95 dark:text-amber-100/95">
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium text-amber-900/80 dark:text-amber-200/90">Marca</dt>
                <dd className="min-w-0 font-medium text-amber-950 dark:text-amber-50">
                  {codiceOriginaleAvvisoDuplicato.existing.marca}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium text-amber-900/80 dark:text-amber-200/90">Descrizione</dt>
                <dd className="min-w-0 leading-snug text-amber-950 dark:text-amber-50">
                  {codiceOriginaleAvvisoDuplicato.existing.descrizione}
                </dd>
              </div>
              {codiceOriginaleAvvisoDuplicato.existing.categoria ? (
                <div className="flex gap-2">
                  <dt className="shrink-0 font-medium text-amber-900/80 dark:text-amber-200/90">Categoria</dt>
                  <dd className="min-w-0 text-amber-950 dark:text-amber-50">
                    {codiceOriginaleAvvisoDuplicato.existing.categoria}
                  </dd>
                </div>
              ) : null}
            </dl>
            <button
              type="button"
              onClick={codiceOriginaleAvvisoDuplicato.onVaiAlRicambio}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-orange-300/80 bg-orange-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-orange-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/45 focus-visible:ring-offset-1 active:scale-[0.98] dark:border-orange-600/50 dark:focus-visible:ring-offset-zinc-900 sm:w-auto"
            >
              Vai al ricambio
            </button>
          </div>
        ) : null}
      </RicambioField>
      <RicambioField label="Descrizione *">
        <input
          required={!relaxHtmlValidation}
          value={form.descrizione}
          onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
          className={inputBase}
        />
      </RicambioField>
      <RicambioField label="Note">
        <textarea
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          rows={2}
          className={inputBase}
        />
      </RicambioField>
      <RicambioField label="Categoria *">
        <select
          required={!relaxHtmlValidation}
          value={form.categoria}
          onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
          className={gestionaleSelectNativePlainClass}
        >
          <option value="" disabled={!relaxHtmlValidation}>
            Seleziona categoria
          </option>
          {catOpts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </RicambioField>
      <RicambioField label="Compatibilità mezzi *">
        <div className="mb-2">
          <span className="mb-1 block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Marca attrezzatura</span>
          <select
            value={filtroMarcaCompat}
            onChange={(e) => setFiltroMarcaCompat(e.target.value)}
            className={gestionaleSelectNativePlainClass}
            aria-label="Filtra compatibilità per marca"
          >
            <option value="__tutti__">Tutte le marche</option>
            {marcheAttrezzatura.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            Seleziona prima la marca, poi spunta i modelli compatibili (etichetta salvata come «Marca — Modello»).
          </p>
        </div>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/50 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-900/40">
          {mezziOptsSorted.length === 0 ? (
            <p className="px-1 text-[11px] text-zinc-500">Configura marche e modelli in Impostazioni sistema → Attrezzature.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {mezziOptsSorted.map((m) => (
                <label
                  key={m}
                  className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-white dark:hover:bg-zinc-800/80"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
                    checked={mezziSel.has(m)}
                    onChange={() => toggleMezzo(m)}
                  />
                  <span className="leading-snug text-zinc-800 dark:text-zinc-200">{m}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">
          {mezziSel.size > 0 ? `${mezziSel.size} mezz${mezziSel.size === 1 ? "o" : "i"} selezionati` : "Nessuna selezione"}
        </p>
      </RicambioField>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Scorta</span>
          <div className="mt-1">
            <StockStepper
              groupLabel="Scorta"
              value={form.scorta}
              onChange={(v) => setForm((f) => ({ ...f, scorta: v }))}
              onDelta={(d) => bumpScorta("scorta", d)}
              ariaDecrease="Diminuisci scorta"
              ariaIncrease="Aumenta scorta"
              inputClass={`${inputBase} ${noSpinner}`}
            />
          </div>
        </div>
        <div>
          <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Scorta minima</span>
          <div className="mt-1">
            <StockStepper
              groupLabel="Scorta minima"
              value={form.scortaMinima}
              onChange={(v) => setForm((f) => ({ ...f, scortaMinima: v }))}
              onDelta={(d) => bumpScorta("scortaMinima", d)}
              ariaDecrease="Diminuisci scorta minima"
              ariaIncrease="Aumenta scorta minima"
              inputClass={`${inputBase} ${noSpinner}`}
            />
          </div>
        </div>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Fornitore originale</p>
      <div className="grid grid-cols-2 gap-2">
        <RicambioField label="Prezzo listino €">
          <input
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            value={form.prezzoFornitoreOriginale}
            onChange={(e) =>
              setForm((f) => syncPrezzoVenditaInForm({ ...f, prezzoFornitoreOriginale: e.target.value }))
            }
            className={`${inputBase} ${noSpinner} tabular-nums`}
          />
        </RicambioField>
        <RicambioField label="Sconto %">
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            inputMode="decimal"
            value={form.scontoFornitoreOriginale}
            onChange={(e) => setForm((f) => ({ ...f, scontoFornitoreOriginale: e.target.value }))}
            className={`${inputBase} ${noSpinner} tabular-nums`}
          />
        </RicambioField>
      </div>
      <RicambioField label="Markup % sul listino OE">
        <input
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          value={form.markupPercentuale}
          onChange={(e) =>
            setForm((f) => syncPrezzoVenditaInForm({ ...f, markupPercentuale: e.target.value }))
          }
          onBlur={(e) =>
            setForm((f) =>
              syncPrezzoVenditaInForm({
                ...f,
                markupPercentuale: normalizeMarkupInputString(e.target.value),
              }),
            )
          }
          className={`${inputBase} ${noSpinner} tabular-nums`}
        />
      </RicambioField>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Alternativo</p>
      <RicambioField label="Fornitore non originale">
        <input
          value={form.fornitoreNonOriginale}
          onChange={(e) => setForm((f) => ({ ...f, fornitoreNonOriginale: e.target.value }))}
          className={inputBase}
        />
      </RicambioField>
      <RicambioField label="Codice alternativo">
        <input
          value={form.codiceFornitoreNonOriginale}
          onChange={(e) => setForm((f) => ({ ...f, codiceFornitoreNonOriginale: e.target.value }))}
          className={`${inputBase} font-mono`}
        />
      </RicambioField>
      <div className="grid grid-cols-2 gap-2">
        <RicambioField label="Prezzo alternativo €">
          <input
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            value={form.prezzoFornitoreNonOriginale}
            onChange={(e) => setForm((f) => ({ ...f, prezzoFornitoreNonOriginale: e.target.value }))}
            className={`${inputBase} ${noSpinner} tabular-nums`}
          />
        </RicambioField>
        <RicambioField label="Sconto alt. %">
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            inputMode="decimal"
            value={form.scontoFornitoreNonOriginale}
            onChange={(e) => setForm((f) => ({ ...f, scontoFornitoreNonOriginale: e.target.value }))}
            className={`${inputBase} ${noSpinner} tabular-nums`}
          />
        </RicambioField>
      </div>
      <MagazzinoPrezziLineari
        listinoOE={previewLineari.listinoOE}
        scontoOE={previewLineari.scontoOE}
        listinoAlt={previewLineari.listinoAlt}
        scontoAlt={previewLineari.scontoAlt}
        markupPct={previewLineari.markupPct}
        prezzoVendita={previewLineari.prezzoVendita}
      />
    </div>
  );
}

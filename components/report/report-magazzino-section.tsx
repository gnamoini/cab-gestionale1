"use client";

import { useCallback, useMemo, useState } from "react";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { MagazzinoCapitalLineChart, MagazzinoEntrateUsciteBars } from "@/components/report/report-charts";
import { erpBtnAccent, erpBtnNeutral } from "@/components/report/report-buttons";
import { cycleReportSort, ReportSortTh, type ReportSortPhase } from "@/components/report/report-sort-th";
import type { ReportCompareDetail } from "@/lib/report/build-report-model";
import { deltaPct } from "@/lib/report/date-ranges";
import type { DateRange } from "@/lib/report/date-ranges";
import type { MagazzinoMonthRow } from "@/lib/report/magazzino-monthly-rows";
import { buildMagazzinoMonthlyRows, magazzinoLogTouchesRange } from "@/lib/report/magazzino-monthly-rows";
import {
  loadMagazzinoManualMonthMap,
  saveMagazzinoManualMonthMap,
  type MagazzinoManualMonthMap,
} from "@/lib/report/magazzino-manual-storage";
import {
  dsInput,
  dsModalBackdrop,
  dsModalPanel,
  dsSurfaceCard,
  dsTableRow,
  dsTableTd,
  dsTableWrap,
  dsScrollbar,
  dsSectionTitle,
  dsTypoSmall,
  gestionaleSelectNativePlainClass,
} from "@/lib/ui/design-system";

function fmtPct(p: number | null): string {
  if (p == null) return "—";
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

type MagSortKey = "mese" | "entrate" | "uscite" | "deltaQty" | "deltaCapitale" | "capitaleFinale";

function magCell(r: MagazzinoMonthRow, k: MagSortKey): string | number {
  switch (k) {
    case "mese":
      return r.key;
    case "entrate":
      return r.entrate;
    case "uscite":
      return r.uscite;
    case "deltaQty":
      return r.deltaQty;
    case "deltaCapitale":
      return r.deltaCapitale;
    case "capitaleFinale":
      return r.capitaleFinale;
    default:
      return 0;
  }
}

export function ReportMagazzinoSection({
  magLog,
  prodotti,
  anchor,
  range,
  compareDetail,
  histRev,
  onHistRev,
}: {
  magLog: MagazzinoChangeLogEntry[];
  prodotti: RicambioMagazzino[];
  anchor: Date;
  range: DateRange;
  compareDetail: ReportCompareDetail | null;
  histRev: number;
  onHistRev: () => void;
}) {
  const manual = useMemo(() => loadMagazzinoManualMonthMap(), [histRev]);
  const { rows, hasRawLog, note } = useMemo(
    () => buildMagazzinoMonthlyRows(magLog, prodotti, range, anchor, manual),
    [magLog, prodotti, range, anchor, manual],
  );

  const logInRange = useMemo(() => magazzinoLogTouchesRange(magLog, range), [magLog, range]);
  const hasManualInRange = useMemo(() => {
    for (const r of rows) {
      const p = manual[r.key];
      if (p && Object.keys(p).length > 0) return true;
    }
    return false;
  }, [rows, manual]);

  const showEmpty = rows.length === 0 || (!logInRange && !hasRawLog && !hasManualInRange);

  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(rows[0]?.key ?? "");
  const [ent, setEnt] = useState("");
  const [usc, setUsc] = useState("");
  const [dQty, setDQty] = useState("");
  const [dCap, setDCap] = useState("");
  const [cFin, setCFin] = useState("");

  const [sortColumn, setSortColumn] = useState<MagSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<ReportSortPhase>("natural");

  const onSortMag = useCallback(
    (k: MagSortKey) => {
      const n = cycleReportSort(sortColumn, sortPhase, k);
      setSortColumn(n.column as MagSortKey | null);
      setSortPhase(n.phase);
    },
    [sortColumn, sortPhase],
  );

  const orderIndex = useMemo(() => new Map(rows.map((r, i) => [r.key, i])), [rows]);

  const sortedRows = useMemo(() => {
    if (sortPhase === "natural" || sortColumn == null) return rows;
    const c = [...rows];
    c.sort((a, b) => {
      const va = magCell(a, sortColumn);
      const vb = magCell(b, sortColumn);
      const m =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "it");
      const p = sortPhase === "asc" ? m : -m;
      if (p !== 0) return p;
      return (orderIndex.get(a.key) ?? 0) - (orderIndex.get(b.key) ?? 0);
    });
    return c;
  }, [rows, sortColumn, sortPhase, orderIndex]);

  function openModal() {
    const k = rows[0]?.key ?? "";
    setKey(k);
    const p = manual[k] ?? {};
    setEnt(p.entrate != null ? String(p.entrate) : "");
    setUsc(p.uscite != null ? String(p.uscite) : "");
    setDQty(p.deltaQty != null ? String(p.deltaQty) : "");
    setDCap(p.deltaCapitale != null ? String(p.deltaCapitale) : "");
    setCFin(p.capitaleFinale != null ? String(p.capitaleFinale) : "");
    setOpen(true);
  }

  function saveManual() {
    if (!key) return;
    const next: MagazzinoManualMonthMap = { ...manual };
    const patch = { ...(next[key] ?? {}) };
    if (ent.trim()) patch.entrate = Number(ent);
    else delete patch.entrate;
    if (usc.trim()) patch.uscite = Number(usc);
    else delete patch.uscite;
    if (dQty.trim()) patch.deltaQty = Number(dQty);
    else delete patch.deltaQty;
    if (dCap.trim()) patch.deltaCapitale = Number(dCap);
    else delete patch.deltaCapitale;
    if (cFin.trim()) patch.capitaleFinale = Number(cFin);
    else delete patch.capitaleFinale;
    if (Object.keys(patch).length === 0) delete next[key];
    else next[key] = patch;
    saveMagazzinoManualMonthMap(next);
    onHistRev();
    setOpen(false);
  }

  const dAbsCap = compareDetail
    ? compareDetail.magDeltaCapCur - compareDetail.magDeltaCapPrev
    : 0;
  const cmpMag =
    compareDetail != null ? (
      <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">Confronto periodo (magazzino)</span>
        {" · "}
        Somma Δ capitale: {compareDetail.magDeltaCapCur.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}{" "}
        vs {compareDetail.magDeltaCapPrev.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} (
        {fmtPct(deltaPct(compareDetail.magDeltaCapCur, compareDetail.magDeltaCapPrev))}
        {dAbsCap !== 0 ? (
          <span className="tabular-nums">
            {" "}
            · Δ ass. {dAbsCap > 0 ? "+" : ""}
            {dAbsCap.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
          </span>
        ) : null}
        )
      </div>
    ) : null;

  return (
    <div className={`${dsSurfaceCard} p-4`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={dsSectionTitle}>Magazzino / ricambi</h2>
          <p className={dsTypoSmall}>{note}</p>
        </div>
        <button type="button" onClick={openModal} className={`${erpBtnNeutral} shrink-0 sm:text-sm`}>
          Gestisci storico magazzino
        </button>
      </div>

      {cmpMag}

      {showEmpty ? (
        <p className="mb-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          Nessun dato disponibile: nessun movimento di magazzino nel periodo selezionato. Puoi inserire dati manuali per
          ricostruire mesi mancanti.
        </p>
      ) : null}

      <div className={`${dsTableWrap} ${dsScrollbar}`}>
        <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-sm text-[color:var(--cab-text)]">
          <colgroup>
            <col style={{ width: "22%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "19%" }} />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr>
              <ReportSortTh label="Mese" columnKey="mese" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMag} />
              <ReportSortTh
                label="Entrate"
                columnKey="entrate"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSortMag}
                align="right"
              />
              <ReportSortTh
                label="Uscite"
                columnKey="uscite"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSortMag}
                align="right"
              />
              <ReportSortTh
                label="Δ Q.tà"
                columnKey="deltaQty"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSortMag}
                align="right"
              />
              <ReportSortTh
                label="Δ Capitale"
                columnKey="deltaCapitale"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSortMag}
                align="right"
              />
              <ReportSortTh
                label="Cap. finale"
                columnKey="capitaleFinale"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSortMag}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r) => (
              <tr key={r.key} className={dsTableRow}>
                <td className={`${dsTableTd} font-medium whitespace-nowrap`} title={r.label}>
                  {r.label}
                </td>
                <td className={`${dsTableTd} text-right tabular-nums`}>{r.entrate}</td>
                <td className={`${dsTableTd} text-right tabular-nums`}>{r.uscite}</td>
                <td className={`${dsTableTd} text-right tabular-nums`}>{r.deltaQty > 0 ? `+${r.deltaQty}` : r.deltaQty}</td>
                <td className={`${dsTableTd} text-right tabular-nums text-xs sm:text-sm`}>
                  {r.deltaCapitale.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                </td>
                <td className={`${dsTableTd} text-right text-xs font-semibold tabular-nums sm:text-sm`}>
                  {r.capitaleFinale.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Entrate vs uscite</p>
          {rows.length === 0 ? (
            <p className="text-sm text-zinc-500">Nessun dato.</p>
          ) : (
            <MagazzinoEntrateUsciteBars rows={rows.map((r) => ({ label: r.label, entrate: r.entrate, uscite: r.uscite }))} />
          )}
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Capitale immobilizzato (fine mese)</p>
          {rows.length === 0 ? (
            <p className="text-sm text-zinc-500">Nessun dato.</p>
          ) : (
            <MagazzinoCapitalLineChart rows={rows.map((r) => ({ label: r.label, capitaleFinale: r.capitaleFinale }))} />
          )}
        </div>
      </div>

      {open ? (
        <div
          className={dsModalBackdrop}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className={dsModalPanel} onMouseDown={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[color:var(--cab-text)]">Storico manuale magazzino</h3>
            <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
              Opzionale: sovrascrivi i valori calcolati per un mese. Lascia vuoto un campo per usare il valore automatico.
            </p>
            <label className="mt-3 block text-xs text-[color:var(--cab-text-muted)]">
              Mese (YYYY-MM)
              <select
                className={`${gestionaleSelectNativePlainClass} mt-1 w-full`}
                value={key}
                onChange={(e) => {
                  const k = e.target.value;
                  setKey(k);
                  const p = manual[k] ?? {};
                  setEnt(p.entrate != null ? String(p.entrate) : "");
                  setUsc(p.uscite != null ? String(p.uscite) : "");
                  setDQty(p.deltaQty != null ? String(p.deltaQty) : "");
                  setDCap(p.deltaCapitale != null ? String(p.deltaCapitale) : "");
                  setCFin(p.capitaleFinale != null ? String(p.capitaleFinale) : "");
                }}
              >
                {(rows.length ? rows : [{ key: key || "2026-01", label: key || "2026-01" }]).map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.key}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs text-[color:var(--cab-text-muted)]">
                Entrate
                <input className={`${dsInput} mt-1`} value={ent} onChange={(e) => setEnt(e.target.value)} />
              </label>
              <label className="text-xs text-[color:var(--cab-text-muted)]">
                Uscite
                <input className={`${dsInput} mt-1`} value={usc} onChange={(e) => setUsc(e.target.value)} />
              </label>
              <label className="text-xs text-[color:var(--cab-text-muted)]">
                Δ Quantità
                <input className={`${dsInput} mt-1`} value={dQty} onChange={(e) => setDQty(e.target.value)} />
              </label>
              <label className="text-xs text-[color:var(--cab-text-muted)]">
                Δ Capitale (€)
                <input className={`${dsInput} mt-1`} value={dCap} onChange={(e) => setDCap(e.target.value)} />
              </label>
              <label className="col-span-2 text-xs text-[color:var(--cab-text-muted)]">
                Capitale finale (€)
                <input className={`${dsInput} mt-1`} value={cFin} onChange={(e) => setCFin(e.target.value)} />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={erpBtnNeutral} onClick={() => setOpen(false)}>
                Annulla
              </button>
              <button type="button" className={erpBtnAccent} onClick={saveManual}>
                Salva
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

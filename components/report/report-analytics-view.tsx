"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { ReportControls } from "@/components/report/report-controls";
import { ReportKpiGrid } from "@/components/report/report-kpi-grid";
import { ReportLavorazioniSection } from "@/components/report/report-lavorazioni-section";
import { ReportMagazzinoSection } from "@/components/report/report-magazzino-section";
import { ReportRicambiConsumoSection } from "@/components/report/report-ricambi-consumo-section";
import { ReportTopClienti, ReportTopMezzi } from "@/components/report/report-tops";
import { buildReportModel } from "@/lib/report/build-report-model";
import { endOfLocalDay, formatCompareLabel, startOfLocalDay, type ReportCompareMode, type ReportPeriodPreset } from "@/lib/report/date-ranges";
import { buildTopClientiPeriodo, buildTopMezziPeriodo, mergeTopClientiCompare, mergeTopMezziCompare } from "@/lib/report/report-classifiche";
import { useReportLiveData } from "@/lib/report/use-report-live-data";
import { dsStackPage } from "@/lib/ui/design-system";

function fmtYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysLocal(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0, 0);
}

function ReportSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-9 w-40 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}

export function ReportAnalyticsView() {
  const [mounted, setMounted] = useState(false);
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [preset, setPreset] = useState<ReportPeriodPreset>("last_3_months");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [compareMode, setCompareMode] = useState<ReportCompareMode>("none");
  const [histRev, setHistRev] = useState(0);

  useEffect(() => {
    setMounted(true);
    setAnchor(new Date());
  }, []);

  const live = useReportLiveData();

  const model = useMemo(() => {
    if (!anchor) return null;
    return buildReportModel({
      anchor,
      preset,
      customFrom: preset === "custom" ? customFrom : undefined,
      customTo: preset === "custom" ? customTo : undefined,
      compareMode,
      attive: live.attive,
      storico: live.storico,
      magazzino: live.magazzino,
      mezzi: live.mezzi,
      magLog: live.magLog,
    });
  }, [anchor, preset, customFrom, customTo, compareMode, live]);

  const tops = useMemo(() => {
    if (!model) return null;
    const mezzi = buildTopMezziPeriodo(live.mezzi, live.attive, live.storico, model.range);
    const clienti = buildTopClientiPeriodo(live.attive, live.storico, model.range);
    if (!model.compareRange) return { mezzi, clienti };
    const r = model.compareRange;
    return {
      mezzi: mergeTopMezziCompare(mezzi, buildTopMezziPeriodo(live.mezzi, live.attive, live.storico, r)),
      clienti: mergeTopClientiCompare(clienti, buildTopClientiPeriodo(live.attive, live.storico, r)),
    };
  }, [model, live]);

  if (!mounted || !anchor || !model || !tops) {
    return (
      <div className={dsStackPage}>
        <PageHeader title="REPORT" />
        <ReportSkeleton />
      </div>
    );
  }

  function onPreset(p: ReportPeriodPreset) {
    setPreset(p);
    if (p === "custom" && anchor) {
      const end = endOfLocalDay(anchor);
      const start = startOfLocalDay(addDaysLocal(end, -30));
      setCustomFrom(fmtYmd(start));
      setCustomTo(fmtYmd(end));
    }
  }

  const kpiSubtitle = model.compareRange
    ? `Periodo filtrato · ${formatCompareLabel(model.compareMode, model.range, model.compareRange)}`
    : "Indicatori coerenti con il periodo selezionato (il capitale mostra lo snapshot attuale; il confronto usa la somma dei Δ capitale nel periodo).";

  return (
    <div className={dsStackPage}>
      <PageHeader title="REPORT" />

      <ReportControls
        preset={preset}
        onPreset={onPreset}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFrom={setCustomFrom}
        onCustomTo={setCustomTo}
        compareMode={compareMode}
        onCompareMode={setCompareMode}
      />

      <ShellCard title="Indicatori periodo" subtitle={kpiSubtitle}>
        <ReportKpiGrid items={model.kpis} />
      </ShellCard>

      <ReportLavorazioniSection
        attive={live.attive}
        storico={live.storico}
        anchor={anchor}
        filterRange={model.range}
        compareDetail={model.compareDetail}
        histRev={histRev}
        onHistRev={() => setHistRev((v) => v + 1)}
      />

      <ReportMagazzinoSection
        magLog={live.magLog}
        prodotti={live.magazzino}
        anchor={anchor}
        range={model.range}
        compareDetail={model.compareDetail}
        histRev={histRev}
        onHistRev={() => setHistRev((v) => v + 1)}
      />

      <ReportRicambiConsumoSection magLog={live.magLog} prodotti={live.magazzino} filterRange={model.range} anchor={anchor} />

      <ShellCard title="Classifiche operative" subtitle="Dati reali nel periodo selezionato; con confronto attivo le colonne Δ si riferiscono alla metrica principale della classifica.">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Mezzi più lavorati</h3>
            <ReportTopMezzi rows={tops.mezzi} showCompare={Boolean(model.compareRange)} />
          </div>
          <div className="min-w-0">
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Clienti più attivi</h3>
            <ReportTopClienti rows={tops.clienti} showCompare={Boolean(model.compareRange)} />
          </div>
        </div>
      </ShellCard>
    </div>
  );
}

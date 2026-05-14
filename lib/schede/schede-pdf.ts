"use client";

import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { drawPdfLabelValueLines } from "@/lib/pdf/jspdf-label-lines";
import type { LavorazioneSchedeBundle, SchedaIngressoDoc, SchedaLavorazioniDoc, SchedaRicambiDoc } from "@/types/schede";

function fmtGenIt(): string {
  return new Date().toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function drawPdfHeader(doc: jsPDF, pageW: number, titoloScheda: string, identificazioneLine: string, autore: string, ts: string) {
  doc.setFillColor(234, 88, 12);
  doc.rect(0, 0, pageW, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("CAB GESTIONALE", pageW / 2, 10, { align: "center" });

  doc.setTextColor(24, 24, 27);
  doc.setFontSize(15);
  doc.text(titoloScheda, 14, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(63, 63, 70);
  const subY = identificazioneLine.trim() ? 34 : 32;
  if (identificazioneLine.trim()) {
    const lines = doc.splitTextToSize(identificazioneLine, pageW - 28);
    doc.text(lines, 14, subY);
  }

  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  const metaY = identificazioneLine.trim() ? 34 + (doc.splitTextToSize(identificazioneLine, pageW - 28).length - 1) * 4.2 + 6 : 40;
  doc.text(`Generato il ${ts} · Operatore: ${autore.trim() || "—"}`, 14, Math.max(metaY, 44));
}

function ingressoPairsInIdent(identLower: string, value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (!identLower.trim()) return false;
  return identLower.includes(v.toLowerCase());
}

/** Apre un PDF reale (blob) in nuova scheda — nessun download automatico immediato. */
export function openSchedaPdfInNewTab(opts: {
  titoloScheda: string;
  identificazioneLine: string;
  bundle: LavorazioneSchedeBundle;
  doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc;
  autore: string;
}): void {
  const ts = fmtGenIt();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const ident = opts.identificazioneLine.trim();
  const identLower = ident.toLowerCase();

  drawPdfHeader(doc, pageW, opts.titoloScheda, ident, opts.autore, ts);

  const startY = ident ? 52 : 48;

  if (opts.doc.tipo === "ingresso") {
    const c = opts.doc.campi;
    const raw: { label: string; value: string }[] = [
      { label: "Data ingresso", value: c.dataIngresso },
      { label: "Cliente", value: c.cliente },
      { label: "Cantiere", value: c.cantiere },
      { label: "Utilizzatore", value: c.utilizzatore },
      { label: "Tipo attrezzatura", value: c.tipoAttrezzatura },
      { label: "Marca attrezzatura", value: c.marcaAttrezzatura },
      { label: "Modello attrezzatura", value: c.modelloAttrezzatura },
      { label: "Matricola", value: c.matricola },
      { label: "N. scuderia", value: c.nScuderia },
      { label: "Ore lavoro", value: c.oreLavoro },
      { label: "Tipo telaio", value: c.tipoTelaio },
      { label: "Marca telaio", value: c.marcaTelaio },
      { label: "Modello telaio", value: c.modelloTelaio },
      { label: "Targa", value: c.targa },
      { label: "KM", value: c.km },
      { label: "Livello carburante", value: c.livelloCarburante },
      { label: "Addetto accettazione", value: c.addettoAccettazione },
      { label: "Descrizione anomalia", value: c.descrizioneAnomalia },
    ];
    const pairs = raw
      .map(({ label, value }) => ({ label, value: value?.trim() ? value : "—" }))
      .filter(({ label, value }) => !ingressoPairsInIdent(identLower, value === "—" ? "" : value));
    drawPdfLabelValueLines(doc, startY, pageW, pairs);
  } else if (opts.doc.tipo === "lavorazioni") {
    const c = opts.doc.campi;
    let y = startY;
    const idText = (ident || c.identificazioneMacchina?.trim() || "").trim();
    if (!ident && idText) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(39, 39, 42);
      doc.text("Identificazione macchina", 14, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const idLines = doc.splitTextToSize(idText, pageW - 28);
      doc.text(idLines, 14, y + 5);
      y += 6 + idLines.length * 4.5;
    } else {
      y = startY;
    }

    let oreTotale = 0;
    const body = c.righe.map((r) => {
      for (const a of r.addettiAssegnati ?? []) {
        oreTotale += Number.isFinite(a.oreImpiegate) ? a.oreImpiegate : 0;
      }
      const add =
        (r.addettiAssegnati ?? [])
          .map((a) => `${a.addetto || "—"} (${String(a.oreImpiegate ?? 0)}h)`)
          .join(", ") || "—";
      return [r.dataLavorazione || "—", r.lavorazioniEffettuate || "—", add];
    });
    autoTable(doc, {
      startY: y,
      head: [["Data", "Lavorazioni effettuate", "Addetti (ore)"]],
      body: body.length ? body : [["—", "—", "—"]],
      styles: { fontSize: 8.5, cellPadding: 2, valign: "top", lineColor: [228, 228, 231], lineWidth: 0.15 },
      headStyles: { fillColor: [250, 250, 250], textColor: [39, 39, 42], fontStyle: "bold", fontSize: 9 },
      columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 92 }, 2: { cellWidth: pageW - 26 - 92 - 28 } },
      margin: { left: 14, right: 14 },
      theme: "plain",
    });
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(24, 24, 27);
    doc.text(`ORE TOTALI: ${oreTotale.toFixed(2)}`, 14, finalY + 10);
  } else {
    const c = opts.doc.campi;
    let y = startY;
    const idText = (ident || c.identificazioneMacchina?.trim() || "").trim();
    if (!ident && idText) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(39, 39, 42);
      doc.text("Identificazione macchina", 14, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const idLines = doc.splitTextToSize(idText, pageW - 28);
      doc.text(idLines, 14, y + 5);
      y += 6 + idLines.length * 4.5;
    } else {
      y = startY;
    }

    const body = c.righe.map((r) => [
      r.ricambioNome || "—",
      r.codice || "—",
      String(r.quantita ?? "—"),
      r.addetto || "—",
      r.dataUtilizzo || "—",
    ]);
    autoTable(doc, {
      startY: y,
      head: [["Ricambio", "Codice", "Qtà", "Addetto", "Data"]],
      body: body.length ? body : [["—", "—", "—", "—", "—"]],
      styles: { fontSize: 8.5, cellPadding: 2, lineColor: [228, 228, 231], lineWidth: 0.15 },
      headStyles: { fillColor: [250, 250, 250], textColor: [39, 39, 42], fontStyle: "bold", fontSize: 9 },
      margin: { left: 14, right: 14 },
      theme: "plain",
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(`${opts.titoloScheda} · Pag. ${i}/${pageCount} · ${ts}`, 14, doc.internal.pageSize.getHeight() - 8);
  }

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  openUrlInNewTab(url, { revokeBlobUrlAfterMs: 120_000 });
}

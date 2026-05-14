"use client";

import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatIdentificazioneMezzoLine,
  type MezzoIdentificazioneParts,
} from "@/lib/mezzi/identificazione-mezzo";
import { drawPdfLabelValueLines } from "@/lib/pdf/jspdf-label-lines";
import { totaleNettoRigaRicambio } from "@/lib/preventivi/preventivi-totals";
import type { PreventivoRecord } from "@/lib/preventivi/types";

function fmtGenIt(): string {
  return new Date().toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function openPreventivoPdfInNewTab(p: PreventivoRecord, autore: string): void {
  const ts = fmtGenIt();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(234, 88, 12);
  doc.rect(0, 0, pageW, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("CAB GESTIONALE", pageW / 2, 10, { align: "center" });

  doc.setTextColor(24, 24, 27);
  doc.setFontSize(16);
  doc.text("PREVENTIVO", 14, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(63, 63, 70);
  const parts: MezzoIdentificazioneParts = {
    targa: p.targa,
    matricola: p.matricola,
    nScuderia: p.nScuderia,
    marcaAttrezzatura: p.marcaAttrezzatura,
    modelloAttrezzatura: p.modelloAttrezzatura,
    cliente: p.cliente,
    cantiere: p.cantiere,
    utilizzatore: p.utilizzatore,
  };
  const ident = formatIdentificazioneMezzoLine(parts);
  const headLines = [`Numero: ${p.numero}`, `Data: ${new Date(p.dataCreazione).toLocaleDateString("it-IT")}`, ident].join(" · ");
  const hl = doc.splitTextToSize(headLines, pageW - 28);
  doc.text(hl, 14, 34);
  let y = 36 + hl.length * 4.5;

  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  doc.text(`Generato il ${ts} · Operatore: ${autore.trim() || "—"}`, 14, Math.max(y, 48));
  y = Math.max(y, 52) + 4;

  y = drawPdfLabelValueLines(doc, y, pageW, [
    { label: "Cliente", value: p.cliente || "—" },
    { label: "Cantiere", value: p.cantiere || "—" },
    { label: "Utilizzatore", value: p.utilizzatore || "—" },
  ]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text("Lavorazioni", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(24, 24, 27);
  const lavLines = doc.splitTextToSize(p.descrizioneLavorazioniCliente || "—", pageW - 28);
  doc.text(lavLines, 14, y);
  y += lavLines.length * 4.8 + 6;

  const ricBody = p.righeRicambi.map((r) => {
    const net = totaleNettoRigaRicambio(r);
    return [
      r.codiceOE,
      r.descrizione,
      String(r.quantita),
      `${r.prezzoUnitario.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €`,
      `${(r.scontoPercent ?? 0).toLocaleString("it-IT", { maximumFractionDigits: 1 })} %`,
      `${net.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €`,
    ];
  });
  autoTable(doc, {
    startY: y,
    head: [["Codice OE", "Descrizione", "Qtà", "Prezzo unit.", "Sconto %", "Totale netto"]],
    body: ricBody.length ? ricBody : [["—", "—", "—", "—", "—", "—"]],
    styles: { fontSize: 8.5, cellPadding: 1.6 },
    headStyles: { fillColor: [250, 250, 250], textColor: [39, 39, 42], fontStyle: "bold" },
    margin: { left: 14, right: 14 },
    theme: "plain",
  });
  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
  y += 8;

  const addettiLine =
    p.manodopera.righeAddetti.length > 0
      ? p.manodopera.righeAddetti.map((a) => `${a.addetto} (${a.ore} h)`).join(", ")
      : "—";
  y = drawPdfLabelValueLines(doc, y, pageW, [
    { label: "Manodopera — Ore totali", value: String(p.manodopera.oreTotali) },
    { label: "Manodopera — Addetti", value: addettiLine },
    {
      label: "Manodopera — Costo orario",
      value: `${p.manodopera.costoOrario.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €`,
    },
    ...(p.manodopera.scontoPercent > 0
      ? [{ label: "Manodopera — Sconto %", value: `${p.manodopera.scontoPercent} %` }]
      : []),
    {
      label: "Manodopera — Totale",
      value: `${p.totaleManodopera.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €`,
    },
  ]);

  y = drawPdfLabelValueLines(doc, y, pageW, [
    {
      label: "Totale ricambi",
      value: `${p.totaleRicambi.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €`,
    },
    {
      label: "Totale manodopera",
      value: `${p.totaleManodopera.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €`,
    },
    {
      label: "Totale finale",
      value: `${p.totaleFinale.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €`,
    },
  ]);

  if (p.noteFinali.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27);
    doc.text("Note", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const nLines = doc.splitTextToSize(p.noteFinali, pageW - 28);
    doc.text(nLines, 14, y + 5);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(
      `${p.numero} · Pag. ${i}/${pageCount} · ${ts}`,
      14,
      doc.internal.pageSize.getHeight() - 8,
    );
  }

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  openUrlInNewTab(url, { revokeBlobUrlAfterMs: 120_000 });
}

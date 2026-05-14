import { bunderKindLabel } from "@/lib/bunder/doc-kind-meta";
import { totaleDocumento } from "@/lib/bunder/bunder-generate-default";
import type { BunderCommercialDocument } from "@/lib/bunder/types";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function fmtIt(d: string): string {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return d;
  }
}

export function openBunderPdfInNewTab(doc: BunderCommercialDocument, autore: string): void {
  const ts = new Date().toLocaleString("it-IT");
  const j = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = j.internal.pageSize.getWidth();
  let y = 14;

  j.setFont("helvetica", "bold");
  j.setFontSize(11);
  j.text("BUNDER Company srl", 14, y);
  j.setFont("helvetica", "normal");
  j.setFontSize(9);
  y += 5;
  const headAddr = j.splitTextToSize(
    "Via G. Di Vittorio, 14 — 20063 Cernusco sul Naviglio (MI) — P.IVA IT 09876521009 — commerciale@bunder.it — PEC: bunder@legalmail.it",
    pageW - 28,
  );
  j.text(headAddr, 14, y);
  y += headAddr.length * 4.2 + 4;

  j.setFont("helvetica", "bold");
  j.setFontSize(10);
  j.text(`${bunderKindLabel(doc.kind).toUpperCase()}  ${doc.numeroProgressivo}`, 14, y);
  y += 6;
  j.setFont("helvetica", "normal");
  j.setFontSize(9);
  j.text(`Ns. Rif.: ${doc.riferimentoInterno} · ${doc.luogo}, ${fmtIt(doc.dataDocumento)}`, 14, y);
  y += 8;

  j.setFont("helvetica", "bold");
  j.text("Destinatario", 14, y);
  y += 5;
  j.setFont("helvetica", "normal");
  const dest = j.splitTextToSize(
    `Spett.le ${doc.aziendaDestinatario}\n${doc.indirizzo}\n${doc.cap} ${doc.citta}\nC.a.: ${doc.referente}`,
    pageW - 28,
  );
  j.text(dest, 14, y);
  y += dest.length * 4.5 + 6;

  j.setFont("helvetica", "bold");
  j.text("Oggetto", 14, y);
  y += 5;
  j.setFont("helvetica", "normal");
  const og = j.splitTextToSize(doc.oggetto, pageW - 28);
  j.text(og, 14, y);
  y += og.length * 4.5 + 4;

  const intro = j.splitTextToSize(doc.intro, pageW - 28);
  j.text(intro, 14, y);
  y += intro.length * 4.5 + 6;

  const body = doc.righe.map((r) => [
    String(r.quantita),
    r.codice,
    r.nome.slice(0, 48),
    r.descrizioneTecnica.slice(0, 220),
    `${r.prezzoUnitario.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €`,
    `${(r.quantita * r.prezzoUnitario).toLocaleString("it-IT", { minimumFractionDigits: 2 })} €`,
  ]);
  autoTable(j, {
    startY: y,
    head: [["Qtà", "Codice", "Articolo", "Descr. tecnica", "Pr. unit.", "Totale"]],
    body: body.length ? body : [["—", "—", "—", "—", "—", "—"]],
    styles: { fontSize: 7.5, cellPadding: 1.2, overflow: "linebreak" },
    headStyles: { fillColor: [245, 245, 245], textColor: [30, 30, 30], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 22 }, 2: { cellWidth: 32 }, 3: { cellWidth: 58 } },
    margin: { left: 14, right: 14 },
    theme: "plain",
  });
  y = (j as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 6;

  j.setFont("helvetica", "bold");
  j.text(`Totale imponibile: ${totaleDocumento(doc).toLocaleString("it-IT", { minimumFractionDigits: 2 })} €`, 14, y);
  y += 8;

  const cond = [
    ["IVA", doc.condizioni.iva],
    ["Resa", doc.condizioni.resa],
    ["Trasporto", doc.condizioni.trasporto],
    ["Assemblaggio", doc.condizioni.assemblaggio],
    ["Consegna", doc.condizioni.consegna],
    ["Pagamento", doc.condizioni.pagamento],
    ["Garanzia", doc.condizioni.garanzia],
    ["Validità", doc.condizioni.validitaOfferta],
  ];
  autoTable(j, {
    startY: y,
    head: [["Voce", "Valore"]],
    body: cond,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [238, 238, 238], fontStyle: "bold" },
    margin: { left: 14, right: 14 },
    theme: "grid",
  });
  y = (j as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 6;

  j.setFont("helvetica", "bold");
  j.text("Clausole", 14, y);
  y += 5;
  j.setFont("helvetica", "normal");
  j.setFontSize(8);
  const cl = j.splitTextToSize(doc.clausoleLegali, pageW - 28);
  j.text(cl, 14, y);
  y += cl.length * 3.8 + 6;

  j.setFontSize(9);
  j.text(doc.chiusura, 14, y);
  y += 10;
  j.setFontSize(8.5);
  const firma = j.splitTextToSize(doc.noteFirma, pageW - 28);
  j.text(firma, 14, y);

  const n = j.getNumberOfPages();
  for (let i = 1; i <= n; i += 1) {
    j.setPage(i);
    j.setFontSize(7.5);
    j.setTextColor(110, 110, 120);
    j.text(`${doc.numeroProgressivo} · Pag. ${i}/${n} · ${ts} · ${autore.trim() || "—"}`, 14, j.internal.pageSize.getHeight() - 8);
  }

  const blob = j.output("blob");
  const url = URL.createObjectURL(blob);
  openUrlInNewTab(url, { revokeBlobUrlAfterMs: 120_000 });
}

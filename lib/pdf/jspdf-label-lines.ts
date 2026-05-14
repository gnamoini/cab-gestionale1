import type { jsPDF } from "jspdf";

/** Etichetta in grassetto, valore normale (stesso stile su tutti i PDF gestionale). */
export function drawPdfLabelValueLines(
  doc: jsPDF,
  startY: number,
  pageW: number,
  pairs: { label: string; value: string }[],
): number {
  const marginL = 14;
  const marginR = 14;
  const maxW = pageW - marginL - marginR;
  let y = startY;
  const lineH = 4.8;
  doc.setFontSize(9.5);
  doc.setTextColor(24, 24, 27);
  for (const { label, value } of pairs) {
    const valStr = value?.trim() ? value : "—";
    doc.setFont("helvetica", "bold");
    const prefix = `${label}: `;
    doc.text(prefix, marginL, y);
    const pw = doc.getTextWidth(prefix);
    doc.setFont("helvetica", "normal");
    const restW = Math.max(24, maxW - pw);
    const valLines = doc.splitTextToSize(valStr, restW) as string[];
    if (!valLines.length) {
      y += lineH;
      continue;
    }
    doc.text(valLines[0]!, marginL + pw, y);
    for (let i = 1; i < valLines.length; i += 1) {
      y += lineH;
      doc.text(valLines[i]!, marginL + pw, y);
    }
    y += lineH;
  }
  return y + 4;
}

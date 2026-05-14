import { openBlankWindowForDocumentWrite, openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { bunderKindLabel } from "@/lib/bunder/doc-kind-meta";
import { totaleDocumento } from "@/lib/bunder/bunder-generate-default";
import type { BunderCommercialDocument } from "@/lib/bunder/types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtItDate(isoYmd: string): string {
  try {
    return new Date(isoYmd + "T12:00:00").toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoYmd;
  }
}

export function buildBunderHtmlDocumentBody(d: BunderCommercialDocument): string {
  const tot = totaleDocumento(d);
  const righeRows = d.righe
    .map(
      (r) => `
    <tr>
      <td style="text-align:right;padding:6px;border:1px solid #ccc">${esc(String(r.quantita))}</td>
      <td style="padding:6px;border:1px solid #ccc;font-family:Consolas,monospace;font-size:10pt">${esc(r.codice)}</td>
      <td style="padding:6px;border:1px solid #ccc;font-weight:600">${esc(r.nome)}</td>
      <td style="padding:6px;border:1px solid #ccc;font-size:9pt;line-height:1.35">${esc(r.descrizioneTecnica)}</td>
      <td style="text-align:right;padding:6px;border:1px solid #ccc">${r.prezzoUnitario.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €</td>
      <td style="text-align:right;padding:6px;border:1px solid #ccc;font-weight:600">${(r.quantita * r.prezzoUnitario).toLocaleString("it-IT", { minimumFractionDigits: 2 })} €</td>
    </tr>`,
    )
    .join("");

  const condRows = [
    ["IVA", d.condizioni.iva],
    ["Resa", d.condizioni.resa],
    ["Trasporto", d.condizioni.trasporto],
    ["Assemblaggio", d.condizioni.assemblaggio],
    ["Consegna", d.condizioni.consegna],
    ["Pagamento", d.condizioni.pagamento],
    ["Garanzia", d.condizioni.garanzia],
    ["Validità offerta", d.condizioni.validitaOfferta],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:5px 8px;border:1px solid #ddd;font-weight:600;width:28%">${esc(k)}</td><td style="padding:5px 8px;border:1px solid #ddd">${esc(v)}</td></tr>`,
    )
    .join("");

  return `
  <div style="font-family:'Times New Roman',Times,serif;font-size:11pt;color:#111;max-width:210mm;margin:0 auto;line-height:1.35">
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
      <tr>
        <td style="vertical-align:top;width:58%">
          <div style="font-size:13pt;font-weight:bold">BUNDER Company srl</div>
          <div style="margin-top:4px">Via G. Di Vittorio, 14<br/>20063 Cernusco sul Naviglio (MI)<br/>P.IVA IT 09876521009</div>
          <div style="margin-top:6px;font-size:10pt">Tel. +39 02 1234567 · commerciale@bunder.it<br/>PEC: bunder@legalmail.it</div>
        </td>
        <td style="vertical-align:top;text-align:right;font-size:10pt">
          <div><strong>Ns. Rif.:</strong> ${esc(d.riferimentoInterno)}</div>
          <div style="margin-top:6px"><strong>${esc(d.luogo)}, lì ${fmtItDate(d.dataDocumento)}</strong></div>
          <div style="margin-top:8px;font-size:9pt;color:#444">${esc(bunderKindLabel(d.kind))}<br/><strong>${esc(d.numeroProgressivo)}</strong></div>
        </td>
      </tr>
    </table>

    <div style="margin:12px 0 6px;font-size:10pt"><strong>Spett.le</strong></div>
    <div style="font-weight:bold;font-size:12pt">${esc(d.aziendaDestinatario)}</div>
    <div style="margin-top:2px">${esc(d.indirizzo)}<br/>${esc(d.cap)} ${esc(d.citta)}</div>
    <div style="margin-top:8px;font-size:10pt"><strong>C.a.:</strong> ${esc(d.referente)}</div>

    <div style="margin:18px 0 8px;padding:8px 10px;background:#f6f6f6;border-left:3px solid #333">
      <strong>Oggetto:</strong> ${esc(d.oggetto)}
    </div>

    <p style="text-align:justify;margin:10px 0">${esc(d.intro)}</p>

    <div style="margin:14px 0 6px;font-weight:bold">Dettaglio fornitura</div>
    <table style="width:100%;border-collapse:collapse;font-size:10pt">
      <thead>
        <tr style="background:#eaeaea">
          <th style="padding:6px;border:1px solid #999;width:8%">Qtà</th>
          <th style="padding:6px;border:1px solid #999;width:14%">Codice</th>
          <th style="padding:6px;border:1px solid #999;width:22%">Articolo</th>
          <th style="padding:6px;border:1px solid #999">Descrizione tecnica</th>
          <th style="padding:6px;border:1px solid #999;width:12%">Pr. unit.</th>
          <th style="padding:6px;border:1px solid #999;width:12%">Totale</th>
        </tr>
      </thead>
      <tbody>${righeRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="5" style="text-align:right;padding:8px;border:1px solid #999;font-weight:bold">Totale imponibile</td>
          <td style="text-align:right;padding:8px;border:1px solid #999;font-weight:bold">${tot.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €</td>
        </tr>
      </tfoot>
    </table>

    <div style="margin:16px 0 6px;font-weight:bold">Condizioni generali</div>
    <table style="width:100%;border-collapse:collapse;font-size:10pt">${condRows}</table>

    <div style="margin:16px 0 6px;font-weight:bold">Clausole</div>
    <p style="text-align:justify;font-size:9.5pt;white-space:pre-wrap">${esc(d.clausoleLegali)}</p>

    <p style="margin-top:18px">${esc(d.chiusura)}</p>

    <div style="margin-top:28px;white-space:pre-wrap;font-size:10pt">${esc(d.noteFirma)}</div>

    <div style="margin-top:36px;padding-top:12px;border-top:1px dashed #999;font-size:10pt">
      <strong>Per conferma ed accettazione</strong><br/>
      Rif. documento <strong>${esc(d.numeroProgressivo)}</strong>
      <div style="margin-top:32px">______________________________<br/><span style="font-size:9pt;color:#555">Timbro e firma per accettazione cliente</span></div>
    </div>
  </div>`;
}

export function buildBunderFullHtml(d: BunderCommercialDocument, opts?: { autoPrint?: boolean }): string {
  const body = buildBunderHtmlDocumentBody(d);
  const printScript = opts?.autoPrint
    ? `<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},300);});<\/script>`
    : "";
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"/><title>${esc(d.numeroProgressivo)}</title>${printScript}</head><body style="margin:16px;background:#fff">${body}</body></html>`;
}

export function openBunderWordInNewTab(d: BunderCommercialDocument): void {
  const html = buildBunderFullHtml(d);
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  openUrlInNewTab(url, { revokeBlobUrlAfterMs: 120_000 });
}

export function openBunderPrintPreview(d: BunderCommercialDocument): void {
  const html = buildBunderFullHtml(d, { autoPrint: true });
  const w = openBlankWindowForDocumentWrite();
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

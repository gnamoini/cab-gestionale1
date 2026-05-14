import type { LavorazioneSchedeBundle, SchedaIngressoDoc, SchedaLavorazioniDoc, SchedaRicambiDoc } from "@/types/schede";
import { openBlankWindowForDocumentWrite, openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function rowsTable(rows: [string, string][]): string {
  const body = rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v || "—")}</td></tr>`).join("");
  return `<table class="t"><tbody>${body}</tbody></table>`;
}

function cssBase(): string {
  return `
  @page { margin: 14mm; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size:11px; color:#111; }
  .hdr { border-bottom:2px solid #ea580c; padding-bottom:8px; margin-bottom:12px; }
  .logo { font-weight:800; font-size:16px; color:#ea580c; }
  .title { font-size:15px; font-weight:700; margin:8px 0 4px; }
  .meta { color:#555; font-size:10px; margin-bottom:12px; }
  .section { margin-top:14px; page-break-inside:avoid; }
  .h2 { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; margin:0 0 6px; color:#444; }
  table.t { width:100%; border-collapse:collapse; margin-top:4px; }
  table.t th { text-align:left; width:32%; padding:4px 8px; background:#f4f4f5; border:1px solid #e4e4e7; font-size:10px; vertical-align:top; }
  table.t td { padding:4px 8px; border:1px solid #e4e4e7; font-size:10px; vertical-align:top; }
  .foot { position:fixed; bottom:0; left:0; right:0; font-size:9px; color:#666; border-top:1px solid #ddd; padding:6px 10px; display:flex; justify-content:space-between; }
`;
}

export function openSchedaPrintWindow(opts: {
  titoloScheda: string;
  sottotitoloMacchina: string;
  bundle: LavorazioneSchedeBundle;
  doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc;
  autore: string;
}): void {
  const now = new Date();
  const ts = now.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  let bodyInner = "";
  if (opts.doc.tipo === "ingresso") {
    const c = opts.doc.campi;
    bodyInner = rowsTable([
      ["Data ingresso", c.dataIngresso],
      ["Cliente", c.cliente],
      ["Cantiere", c.cantiere],
      ["Utilizzatore", c.utilizzatore],
      ["Tipo attrezzatura", c.tipoAttrezzatura],
      ["Marca attrezzatura", c.marcaAttrezzatura],
      ["Modello attrezzatura", c.modelloAttrezzatura],
      ["Matricola", c.matricola],
      ["N. scuderia", c.nScuderia],
      ["Ore lavoro", c.oreLavoro],
      ["Tipo telaio", c.tipoTelaio],
      ["Marca telaio", c.marcaTelaio],
      ["Modello telaio", c.modelloTelaio],
      ["Targa", c.targa],
      ["KM", c.km],
      ["Descrizione anomalia", c.descrizioneAnomalia],
      ["Livello carburante", c.livelloCarburante],
      ["Addetto accettazione", c.addettoAccettazione],
    ]);
  } else if (opts.doc.tipo === "lavorazioni") {
    const c = opts.doc.campi;
    const righe = c.righe
      .map((r) => {
        const addCell = (r.addettiAssegnati ?? [])
          .map((a) => `${esc(a.addetto || "—")} (${esc(String(a.oreImpiegate))}h)`)
          .join("<br/>");
        return `<tr><td>${esc(r.dataLavorazione)}</td><td>${esc(r.lavorazioniEffettuate)}</td><td>${addCell || "—"}</td></tr>`;
      })
      .join("");
    bodyInner = `<p><strong>Identificazione</strong> ${esc(c.identificazioneMacchina)}</p>
    <table class="t"><thead><tr><th>Data</th><th>Lavorazioni effettuate</th><th>Addetti (ore)</th></tr></thead><tbody>${righe || `<tr><td colspan="3">—</td></tr>`}</tbody></table>`;
  } else {
    const c = opts.doc.campi;
    const righe = c.righe
      .map(
        (r) =>
          `<tr><td>${esc(r.ricambioNome)}</td><td>${esc(r.codice)}</td><td style="text-align:right">${esc(String(r.quantita))}</td><td>${esc(r.addetto)}</td><td>${esc(r.dataUtilizzo)}</td></tr>`,
      )
      .join("");
    bodyInner = `<p><strong>Identificazione</strong> ${esc(c.identificazioneMacchina)}</p>
    <table class="t"><thead><tr><th>Ricambio</th><th>Codice</th><th>Qtà</th><th>Addetto</th><th>Data</th></tr></thead><tbody>${righe || `<tr><td colspan="5">—</td></tr>`}</tbody></table>`;
  }

  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"/><title>${esc(opts.titoloScheda)}</title>
  <style>${cssBase()}</style></head><body>
  <div class="hdr">
    <div class="logo">CAB Gestionale</div>
    <div class="title">${esc(opts.titoloScheda)}</div>
    <div class="meta">${esc(opts.sottotitoloMacchina)} · Agg. ${esc(ts)} · Autore stampa: ${esc(opts.autore)}</div>
  </div>
  <div class="section"><div class="h2">Contenuto</div>${bodyInner}</div>
  <div class="foot"><span>${esc(opts.titoloScheda)}</span><span>Pag. 1</span><span>${esc(ts)}</span></div>
  </body></html>`;

  const w = openBlankWindowForDocumentWrite();
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export function openBlobInNewTab(mime: string, base64: string, _fileName: string): void {
  const url = `data:${mime};base64,${base64}`;
  openUrlInNewTab(url);
}

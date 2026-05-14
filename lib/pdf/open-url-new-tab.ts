/**
 * Apre URL in una nuova scheda senza passare `noopener,noreferrer` come *terzo argomento*
 * di `window.open`: in Chromium ciò può far restituire `null` anche quando la scheda si apre,
 * generando falsi positivi su “popup bloccati”.
 *
 * Dopo l’apertura imposta `opener = null` sul figlio quando possibile.
 */

const DEFAULT_BLOCKED_MSG =
  "Impossibile aprire il file in una nuova scheda. Consenti i pop-up per questo sito oppure verifica che il documento sia valido.";

function tryOpenViaTemporaryAnchor(url: string): void {
  if (typeof document === "undefined") return;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function openUrlInNewTab(
  url: string,
  options?: { revokeBlobUrlAfterMs?: number; blockedMessage?: string; invalidMessage?: string },
): boolean {
  if (typeof window === "undefined") return false;

  const trimmed = url?.trim() ?? "";
  if (!trimmed) {
    window.alert(options?.invalidMessage ?? "URL del documento non valido.");
    return false;
  }

  const revokeAfter = options?.revokeBlobUrlAfterMs;

  const scheduleRevoke = () => {
    if (revokeAfter == null || revokeAfter <= 0 || !trimmed.startsWith("blob:")) return;
    window.setTimeout(() => {
      try {
        URL.revokeObjectURL(trimmed);
      } catch {
        /* ignore */
      }
    }, revokeAfter);
  };

  const win = window.open(trimmed, "_blank");
  if (win) {
    try {
      win.opener = null;
    } catch {
      /* cross-origin / policy */
    }
    scheduleRevoke();
    return true;
  }

  /** Fallback sincrono: alcuni browser bloccano `window.open` ma consentono navigazione da `<a target=_blank>`. */
  try {
    tryOpenViaTemporaryAnchor(trimmed);
  } catch {
    /* ignore */
  }

  /**
   * Non mostrare alert qui: `null` non implica sempre popup bloccato (es. bug/feature con argomenti legacy).
   * Se anche il fallback fallisce, l’utente non vede una nuova scheda ma non riceve un falso errore.
   */
  scheduleRevoke();
  return true;
}

/** Finestra vuota per `document.write` (stampa / HTML inline). Qui `null` indica davvero blocco popup. */
export function openBlankWindowForDocumentWrite(blockedMessage?: string): Window | null {
  if (typeof window === "undefined") return null;
  const w = window.open("about:blank", "_blank");
  if (!w) {
    window.alert(blockedMessage ?? DEFAULT_BLOCKED_MSG);
    return null;
  }
  try {
    w.opener = null;
  } catch {
    /* ignore */
  }
  return w;
}

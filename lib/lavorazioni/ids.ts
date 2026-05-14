/** Id successivo deterministico (nessun Date.now). */
export function nextLavorazioneId(existingIds: string[]): string {
  let max = 200;
  for (const id of existingIds) {
    const m = /^lav-(\d+)$/.exec(id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `lav-${max + 1}`;
}

export function nextStoricoId(existingIds: string[]): string {
  let max = 100;
  for (const id of existingIds) {
    const m = /^lav-arch-(\d+)$/.exec(id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `lav-arch-${max + 1}`;
}

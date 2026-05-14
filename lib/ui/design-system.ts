/**
 * CAB Gestionale — design system (classi Tailwind + token CSS `--cab-*` / `--ds-*`).
 *
 * Categorie:
 * A — Primario (CTA, Salva): `dsBtnPrimary`, `dsBtnCtaHero`
 * B — Secondario / neutro: `dsBtnSecondary`, `dsBtnNeutral`, `dsBtnSubtle`, `dsBtnSoftOrange`
 * B2 — Ghost: `dsBtnGhost`
 * C — Pericolo: `dsBtnDanger`
 * D — Icon: `dsBtnIcon`
 * E — Select / dropdown nativi: `gestionaleSelectFilterClass`, …
 * F — Input / textarea: `dsInput`, `dsTextarea`, `dsInputAuth`
 * G — Tabella: `dsTableWrap`, `dsTable`, `dsTableHead`, `dsTableRow`, `dsTableSortTh`, …
 * H — Card / KPI: `dsSurfaceCard`, `dsSurfaceInteractiveKpi`
 * I — Modale: `dsModalBackdrop`, `dsModalPanel`, `dsLavorazioniModalLayer`, …
 * J — Badge: `dsBadgeNeutral`, …
 * K — Scrollbar: `gestionale-scrollbar` (globals) + `dsScrollbar`
 * L — Tipografia: `dsTypoPageTitle`, `dsSectionTitle`, …
 * M — Z-index / layer: `dsZHeader`, `dsZDrawer`, `dsZModal`, `dsZModalHigh`, `dsZToast`
 * N — Skeleton: `dsSkeletonLine`, `dsSkeletonBlock`
 */

const cabText = "text-[color:var(--cab-text)]";
const cabTextMuted = "text-[color:var(--cab-text-muted)]";
const cabBorder = "border-[color:var(--cab-border)]";
const cabSurface = "bg-[var(--cab-surface)]";
const cabCard = "bg-[var(--cab-card)]";

/** Focus ring e micro-feedback click — usare su tutti i controlli interattivi. */
export const dsFocus =
  "outline-none transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_42%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--cab-bg-app)] dark:focus-visible:ring-offset-[var(--cab-bg-app)]";

export const dsDisabled = "disabled:pointer-events-none disabled:opacity-55";

/** D — Neutro: Chiudi, Annulla, azioni discrete */
export const dsBtnNeutral = `inline-flex items-center justify-center gap-1.5 rounded-[var(--ds-radius-lg)] ${cabBorder} ${cabSurface} px-2.5 py-2 text-xs font-medium ${cabText} shadow-[var(--cab-shadow-sm)] hover:bg-[var(--cab-hover)] hover:shadow-[var(--cab-shadow-md)] hover:ring-1 hover:ring-[color:color-mix(in_srgb,var(--cab-border)_75%,transparent)] ${dsFocus} ${dsDisabled}`;

/** Toolbar intestazione pagina */
export const dsPageToolbarBtn = `inline-flex min-h-[2.5rem] shrink-0 items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] ${cabSurface} px-3 py-2 text-xs font-semibold ${cabText} shadow-[var(--cab-shadow-sm)] transition-[background-color,box-shadow,ring-color,border-color,color] duration-200 ease-out hover:bg-[var(--cab-hover)] hover:shadow-[var(--cab-shadow-md)] hover:ring-1 hover:ring-[color:color-mix(in_srgb,var(--cab-border-strong)_70%,transparent)] ${dsFocus} ${dsDisabled}`;

export const dsBtnSettings = dsPageToolbarBtn;

/** A — Primario */
export const dsBtnPrimary = `inline-flex items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_30%,var(--cab-border))] bg-[var(--cab-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--cab-shadow-sm)] hover:brightness-[1.06] hover:shadow-[var(--cab-shadow-md)] hover:ring-2 hover:ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)] ${dsFocus} ${dsDisabled}`;

/** A — CTA hero */
export const dsBtnCtaHero = `inline-flex items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)] bg-gradient-to-b from-[var(--cab-primary)] to-[color:color-mix(in_srgb,var(--cab-primary)_82%,#000)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--cab-shadow-md)] transition-[transform,box-shadow,filter] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:brightness-[1.03] active:translate-y-0 active:brightness-[0.98] ${dsFocus} ${dsDisabled}`;

/** B — Secondario soft arancio */
export const dsBtnSoftOrange = `inline-flex items-center justify-center rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] px-2.5 py-1.5 text-xs font-medium ${cabText} shadow-[var(--cab-shadow-sm)] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_16%,var(--cab-surface))] hover:shadow-[var(--cab-shadow-md)] ${dsFocus} ${dsDisabled}`;

export const dsBtnIcon = `inline-flex min-w-[2rem] items-center justify-center rounded-[var(--ds-radius-lg)] ${cabBorder} ${cabSurface} px-2 py-1.5 text-xs font-medium ${cabText} shadow-[var(--cab-shadow-sm)] hover:bg-[var(--cab-hover)] ${dsFocus} ${dsDisabled}`;

export const dsBtnSubtle = `inline-flex items-center justify-center gap-1.5 rounded-[var(--ds-radius-lg)] ${cabBorder} bg-[color:color-mix(in_srgb,var(--cab-surface-2)_85%,var(--cab-surface))] px-3 py-2 text-xs font-medium ${cabText} shadow-[var(--cab-shadow-sm)] hover:bg-[var(--cab-hover)] hover:shadow-[var(--cab-shadow-md)] ${dsFocus} ${dsDisabled}`;

/** B2 — Ghost (toolbar secondaria, filtri testuali) */
export const dsBtnGhost = `inline-flex items-center justify-center gap-1.5 rounded-[var(--ds-radius-lg)] border border-transparent bg-transparent px-2.5 py-2 text-xs font-medium ${cabTextMuted} hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)] ${dsFocus} ${dsDisabled}`;

/** B — alias “secondario” tab toolbar */
export const dsBtnSecondary = dsBtnNeutral;

/** C — Pericolo */
export const dsBtnDanger = `inline-flex items-center justify-center gap-1.5 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_12%,var(--cab-surface))] px-3 py-2 text-sm font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))] shadow-[var(--cab-shadow-sm)] hover:bg-[color:color-mix(in_srgb,var(--cab-danger)_20%,var(--cab-surface))] ${dsFocus} ${dsDisabled}`;

/** F — Input su sfondo chiaro (form gestionale) */
export const dsInput = `w-full rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] ${cabSurface} px-3 py-2.5 text-sm ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[color:var(--cab-text-muted)] hover:border-[color:var(--cab-border-strong)] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)] ${dsFocus}`;

export const dsTextarea = `${dsInput} min-h-[5.5rem] resize-y`;

/** F — Login / campi su tema scuro */
export const dsInputAuth = `w-full rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border-strong)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_90%,#000)] px-3 py-2.5 text-sm text-[color:var(--cab-text)] shadow-md shadow-black/20 outline-none ring-[color:color-mix(in_srgb,var(--cab-primary)_18%,transparent)] placeholder:text-[color:var(--cab-text-muted)] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_50%,var(--cab-border))] focus:ring-2 ${dsFocus} ${dsDisabled}`;

/** E — Chevron select */
const selectChevronWhite =
  "bg-[length:1.15rem] bg-[right_0.55rem_center] bg-no-repeat bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f4f4f5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.25' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")]";

const gestionaleSelectChevronAccent =
  "bg-[length:1.1rem] bg-[right_0.55rem_center] bg-no-repeat bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f97316'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.25' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")] dark:bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23fb923c'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.25' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")]";

export const selectLavorazioniInline =
  `lavorazioni-select-dk min-w-0 max-w-[11rem] h-10 cursor-pointer appearance-none rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border-strong)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_92%,#000)] py-2 pl-7 pr-8 text-xs font-medium text-[color:var(--cab-text)] shadow-md shadow-black/25 outline-none transition-all duration-200 ease-out hover:border-[color:var(--cab-border)] hover:brightness-[1.05] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_30%,transparent)] ${selectChevronWhite}`;

export const gestionaleSelectFilterClass =
  `min-h-10 w-full min-w-0 cursor-pointer appearance-none rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] ${cabSurface} py-2.5 pl-9 pr-10 text-sm font-semibold leading-snug ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)] ${gestionaleSelectChevronAccent}`;

export const selectLavorazioniFilter = gestionaleSelectFilterClass;

export const gestionaleSelectNativePlainClass =
  `min-h-10 w-full min-w-0 cursor-pointer appearance-none rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] ${cabSurface} py-2.5 pl-3 pr-10 text-sm font-semibold leading-snug ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)] ${gestionaleSelectChevronAccent}`;

export const lavorazioniModalSelectClass =
  `min-h-10 w-full min-w-0 cursor-pointer appearance-none rounded-[var(--ds-radius-lg)] ${cabBorder} ${cabSurface} py-2.5 pl-3 pr-10 text-sm font-medium leading-snug ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_50%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_22%,transparent)]`;

/** G — contenitore tabella (scrollbar: concatenare `dsScrollbar` dove serve) */
export const dsTableWrap = `overflow-x-auto rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabCard} shadow-[var(--cab-shadow-sm)]`;

export const dsTable = `min-w-full border-collapse text-left text-sm ${cabText}`;

/** Intestazione tabella: applicare a `<thead>` o celle `<th>` insieme a `border-b` se serve */
export const dsTableHead = `bg-[var(--cab-surface-2)] text-xs font-semibold uppercase tracking-wide ${cabTextMuted}`;

/** Riga corpo tabella standard */
export const dsTableRow = `border-b ${cabBorder} transition-colors duration-150 ease-out hover:bg-[var(--cab-hover)]`;

/** Cella `<th>` ordinabile (wrapper) — bottone interno in `ReportSortTh` */
export const dsTableSortTh = `border-b ${cabBorder} bg-[var(--cab-surface-2)] px-2 py-2.5 align-middle text-xs font-semibold uppercase tracking-wide sm:px-3`;

/** Celle `<th>` statiche (header tabella modali / report) */
export const dsTableHeadCell = `border-b ${cabBorder} bg-[var(--cab-surface-2)] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide ${cabTextMuted} sm:px-3 sm:py-2.5`;

/** Colonna indice / rank */
export const dsTableThPos = `w-6 min-w-[1.5rem] max-w-[1.75rem] border-b ${cabBorder} bg-[var(--cab-surface-2)] px-0.5 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide ${cabTextMuted}`;

/** Header colonna confronto */
export const dsTableThCompare = `border-b ${cabBorder} bg-[var(--cab-surface-2)] px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wide ${cabTextMuted} sm:px-3`;

/** Celle dati compatte (report / modali) */
export const dsTableTd = `px-2 py-2.5 align-middle text-sm sm:px-3 ${cabText}`;

/** Empty state riga tabella */
export const dsTableEmptyCell = `px-3 py-8 text-center text-sm ${cabTextMuted}`;

/** H — Card statica */
export const dsSurfaceCard = `rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabCard} shadow-[var(--cab-shadow-sm)]`;

export const dsSurfacePanel = `flex min-h-[220px] flex-col rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabSurface} p-4 shadow-[var(--cab-shadow-sm)] transition-all duration-200 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] hover:shadow-[var(--cab-shadow-md)] ${dsFocus}`;

export const dsSurfaceInteractiveKpi = `group flex h-full min-h-[220px] flex-col rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabSurface} p-4 text-left shadow-[var(--cab-shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] hover:shadow-[var(--cab-shadow-md)] active:scale-[0.99] ${dsFocus}`;

export const dsModalBackdrop =
  "fixed inset-0 z-50 flex items-end justify-center bg-[var(--cab-overlay)] p-4 backdrop-blur-[2px] sm:items-center";

export const dsModalPanel = `w-full max-w-lg rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabCard} p-4 shadow-[var(--cab-shadow-md)]`;

/** Modali Lavorazioni (sopra altri layer; z-index dedicato). */
export const dsLavorazioniModalLayer =
  "fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center";
export const dsLavorazioniModalOverlay =
  "absolute inset-0 z-0 cursor-default border-0 bg-[var(--cab-overlay)] p-0 backdrop-blur-[3px]";
export const dsLavorazioniModalDialog =
  `relative z-[1] flex max-h-[min(92dvh,920px)] w-full min-h-0 flex-col overflow-hidden rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabCard} shadow-2xl`;

/** `<th>` sticky per tabelle principali (Preventivi / Lavorazioni / …). */
export const dsTableThSticky =
  "sticky top-0 z-[2] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_96%,transparent)] shadow-[inset_0_-1px_0_0_var(--cab-border)] backdrop-blur-sm";

/** Riga tabella con alternanza leggera (optional, dopo `dsTableRow`). */
export const dsTableRowZebra = "even:bg-[color:color-mix(in_srgb,var(--cab-surface-2)_28%,var(--cab-card))]";

/** Z-index layer (coerenza stacking). */
export const dsZStickyToolbar = "z-[5]";
export const dsZHeader = "z-30";
export const dsZDrawer = "z-[55]";
export const dsZModal = "z-50";
export const dsZModalHigh = "z-[100]";
export const dsZToast = "z-[200]";

/** Skeleton */
export const dsSkeletonPulse =
  "animate-pulse rounded-md bg-[color:color-mix(in_srgb,var(--cab-text-muted)_14%,var(--cab-surface-2))]";
export const dsSkeletonLine = `h-4 w-full max-w-md ${dsSkeletonPulse}`;
export const dsSkeletonBlock = `h-24 w-full ${dsSkeletonPulse}`;

/** J — Badge semantici */
export const dsBadgeNeutral = `rounded-full bg-[color:color-mix(in_srgb,var(--cab-text-muted)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase ${cabText}`;
export const dsBadgeWarn = `rounded-full bg-[color:color-mix(in_srgb,var(--cab-warning)_18%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:color-mix(in_srgb,var(--cab-warning)_85%,var(--cab-text))]`;
export const dsBadgeDanger = `rounded-full bg-[color:color-mix(in_srgb,var(--cab-danger)_18%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]`;
export const dsBadgeOk = `rounded-full bg-[color:color-mix(in_srgb,var(--cab-success)_18%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:color-mix(in_srgb,var(--cab-success)_88%,var(--cab-text))]`;
export const dsBadgeInfo = `rounded-full bg-[color:color-mix(in_srgb,var(--cab-info)_18%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:color-mix(in_srgb,var(--cab-info)_88%,var(--cab-text))]`;

/** Tabs segmentati */
export const dsSegmentedWrap = `flex flex-wrap gap-1 rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabSurface} p-1 shadow-[var(--cab-shadow-sm)]`;
export const dsSegmentedBtnOn = `rounded-[var(--ds-radius-lg)] bg-[var(--cab-primary)] px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors`;
export const dsSegmentedBtnOff = `rounded-[var(--ds-radius-lg)] px-3 py-2 text-sm font-medium ${cabTextMuted} transition-colors hover:bg-[var(--cab-hover)]`;

export const dsScrollbar = "gestionale-scrollbar";

/** L — Tipografia */
export const dsTypoPageTitle = `text-xl font-semibold tracking-tight ${cabText} md:text-2xl`;
export const dsTypoSectionTitle = `text-base font-semibold tracking-tight ${cabText}`;
export const dsTypoCardTitle = `text-sm font-semibold ${cabText}`;
export const dsTypoTableHeader = `text-[10px] font-semibold uppercase tracking-wide ${cabTextMuted}`;
export const dsTypoBody = `text-sm leading-relaxed ${cabText}`;
export const dsTypoSmall = `text-xs leading-snug ${cabTextMuted}`;
export const dsTypoCaption = `text-[11px] leading-snug ${cabTextMuted}`;

/** @deprecated alias — usare `dsTypoPageTitle` */
export const dsPageTitle = dsTypoPageTitle;
export const dsPageDesc = `mt-1 max-w-2xl ${dsTypoSmall}`;
export const dsLabel = dsTypoSmall + " font-medium";

/** Alias espliciti sezione / card */
export const dsSectionTitle = dsTypoSectionTitle;
export const dsCardTitle = dsTypoCardTitle;

/** Stack verticale sotto `PageHeader` */
export const dsStackPage = "space-y-[length:var(--ds-space-xl)]";

/** Toolbar sticky interna */
export const dsStickyToolbar = `sticky top-0 z-[5] rounded-[var(--ds-radius-xl)] ${cabBorder} bg-[color:color-mix(in_srgb,var(--cab-surface-2)_94%,transparent)] px-[length:var(--ds-space-md)] py-[length:var(--ds-space-md)] shadow-[var(--cab-shadow-sm)] backdrop-blur-md sm:px-[length:var(--ds-space-lg)]`;

/** Spacing utility (gap / padding) */
export const dsGapXs = "gap-[length:var(--ds-space-xs)]";
export const dsGapSm = "gap-[length:var(--ds-space-sm)]";
export const dsGapMd = "gap-[length:var(--ds-space-md)]";
export const dsGapLg = "gap-[length:var(--ds-space-lg)]";
export const dsGapXl = "gap-[length:var(--ds-space-xl)]";
export const dsGap2xl = "gap-[length:var(--ds-space-2xl)]";
export const dsPadPage = "p-[length:var(--ds-space-lg)] md:p-[length:var(--ds-space-xl)]";

export const selectPillInner =
  "lavorazioni-select-dk flex min-h-8 w-full min-w-0 flex-1 cursor-pointer appearance-none items-center bg-transparent py-1 pl-2 pr-8 text-[11px] font-semibold leading-tight tracking-wide text-inherit outline-none transition-[background-color,color] duration-150 hover:bg-white/[0.06] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)] focus-visible:ring-offset-0 rounded-[inherit]";

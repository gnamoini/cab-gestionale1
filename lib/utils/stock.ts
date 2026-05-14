import type { StockLevel } from "@/lib/types/gestionale";

const SOGLIA_BASSA = 6;
const SOGLIA_ALTA = 20;

export function getStockLevel(qty: number): StockLevel {
  if (qty < SOGLIA_BASSA) return "basso";
  if (qty > SOGLIA_ALTA) return "alto";
  return "ok";
}

export function stockLevelLabel(level: StockLevel): string {
  switch (level) {
    case "basso":
      return "Basso";
    case "alto":
      return "Alto";
    default:
      return "OK";
  }
}

import { err as serviceError, type ServiceResult } from "@/src/services/service-result";

export function isPostgrestLikeError(e: unknown): e is { message: string; code?: string } {
  return typeof e === "object" && e !== null && "message" in e;
}

export function formatSupabaseError(e: unknown): string {
  if (isPostgrestLikeError(e)) return e.message || "Errore database";
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Errore sconosciuto";
}

export function serviceFailFromError<T = null>(e: unknown, data: T | null = null): ServiceResult<T> {
  return serviceError(formatSupabaseError(e), data);
}

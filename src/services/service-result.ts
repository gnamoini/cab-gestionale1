export type ServiceResult<T> = {
  data: T | null;
  error: string | null;
  success: boolean;
};

export function success<T>(data: T): ServiceResult<T> {
  return { data, error: null, success: true };
}

/**
 * Esito negativo (messaggio + dato opzionale).
 * Nome `err` per non ombreggiare `const { error }` delle risposte Postgrest nei service.
 */
export function err<T = null>(message: string, data: T | null = null): ServiceResult<T> {
  return { data, error: message, success: false };
}

/** Alias semantico richiesto da convenzione API (`error(message)`). */
export const error = err;

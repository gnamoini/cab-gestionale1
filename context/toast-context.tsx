"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { dsZToast } from "@/lib/ui/design-system";

export type CabToastTone = "success" | "warning" | "error" | "info";

type ToastItem = { id: string; message: string; tone: CabToastTone; duration: number };

const TONE_BAR: Record<CabToastTone, string> = {
  success: "border-l-[color:var(--cab-success)]",
  warning: "border-l-[color:var(--cab-warning)]",
  error: "border-l-[color:var(--cab-danger)]",
  info: "border-l-[color:var(--cab-info)]",
};

type ToastContextValue = {
  push: (message: string, tone?: CabToastTone, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function CabToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className={`pointer-events-none fixed bottom-0 right-0 flex max-h-[min(50dvh,22rem)] w-full max-w-sm flex-col-reverse gap-2 overflow-hidden p-3 sm:p-4 ${dsZToast}`}
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`cab-toast-item pointer-events-auto flex items-start gap-2 rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] py-2.5 pl-3 pr-2 shadow-[var(--cab-shadow-md)] ${TONE_BAR[t.tone]} border-l-[3px]`}
        >
          <p className="min-w-0 flex-1 text-xs font-medium leading-snug text-[color:var(--cab-text)]">{t.message}</p>
          <button
            type="button"
            className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold text-[color:var(--cab-text-muted)] transition-colors hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)]"
            onClick={() => onDismiss(t.id)}
            aria-label="Chiudi notifica"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
    const tm = timers.current.get(id);
    if (tm) clearTimeout(tm);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (message: string, tone: CabToastTone = "info", durationMs = 4200) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const duration = Math.max(1800, Math.min(durationMs, 12000));
      setToasts((prev) => [...prev, { id, message, tone, duration }].slice(-5));
      const tm = setTimeout(() => remove(id), duration);
      timers.current.set(id, tm);
    },
    [remove],
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <CabToastViewport toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export const DASHBOARD_TASKS_STORAGE_KEY = "gestionale-dashboard-tasks-v1";
export const DASHBOARD_TASKS_MAX = 80;

export type DashboardTask = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
};

function nextId(): string {
  return `dash-task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTask(raw: unknown): DashboardTask | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const id = typeof t.id === "string" && t.id.trim() ? t.id.trim() : "";
  const text = typeof t.text === "string" ? t.text.trim() : "";
  if (!id || !text) return null;
  return {
    id,
    text: text.slice(0, 500),
    done: Boolean(t.done),
    createdAt: typeof t.createdAt === "string" && t.createdAt.trim() ? t.createdAt : new Date().toISOString(),
  };
}

export function loadDashboardTasks(): DashboardTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DASHBOARD_TASKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: DashboardTask[] = [];
    for (const item of parsed) {
      const n = normalizeTask(item);
      if (n) out.push(n);
    }
    return out.slice(0, DASHBOARD_TASKS_MAX);
  } catch {
    return [];
  }
}

export function saveDashboardTasks(tasks: DashboardTask[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DASHBOARD_TASKS_STORAGE_KEY, JSON.stringify(tasks.slice(0, DASHBOARD_TASKS_MAX)));
  } catch {
    /* ignore */
  }
}

export function createDashboardTask(text: string): DashboardTask {
  const t = text.trim().slice(0, 500);
  return {
    id: nextId(),
    text: t || "Nuova attività",
    done: false,
    createdAt: new Date().toISOString(),
  };
}

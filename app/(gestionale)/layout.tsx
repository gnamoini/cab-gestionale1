import { AppShell } from "@/components/gestionale/app-shell";
import { GestionaleAuthGate } from "@/components/gestionale/gestionale-auth-gate";

export default function GestionaleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <GestionaleAuthGate>{children}</GestionaleAuthGate>
    </AppShell>
  );
}

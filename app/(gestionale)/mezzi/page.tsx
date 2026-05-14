import { Suspense } from "react";
import { MezziView } from "@/components/gestionale/mezzi/mezzi-view";

export default function MezziPage() {
  return (
    <Suspense fallback={null}>
      <MezziView />
    </Suspense>
  );
}

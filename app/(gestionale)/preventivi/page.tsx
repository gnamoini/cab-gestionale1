import { Suspense } from "react";
import { PreventiviView } from "@/components/preventivi/preventivi-view";

export default function PreventiviPage() {
  return (
    <Suspense fallback={null}>
      <PreventiviView />
    </Suspense>
  );
}

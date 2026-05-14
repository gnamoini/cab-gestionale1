import { Suspense } from "react";
import { DocumentiView } from "@/components/gestionale/documenti/documenti-view";

export default function DocumentiPage() {
  return (
    <Suspense fallback={null}>
      <DocumentiView />
    </Suspense>
  );
}

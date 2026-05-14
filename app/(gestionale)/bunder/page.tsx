import { Suspense } from "react";
import { BunderView } from "@/components/bunder/bunder-view";

export default function BunderPage() {
  return (
    <Suspense fallback={null}>
      <BunderView />
    </Suspense>
  );
}

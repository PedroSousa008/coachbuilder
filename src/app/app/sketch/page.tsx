import { Suspense } from "react";
import { SketchAreaClient } from "@/components/sketch/SketchAreaClient";

export default function SketchAreaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading workspace…</p>}>
      <SketchAreaClient />
    </Suspense>
  );
}

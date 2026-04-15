import { Suspense } from "react";
import { SketchAreaClient } from "@/components/sketch/SketchAreaClient";
import { tFor, DEFAULT_LANGUAGE } from "@/lib/i18n";

export default function SketchAreaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">{tFor(DEFAULT_LANGUAGE, "app.loading")}</p>}>
      <SketchAreaClient />
    </Suspense>
  );
}

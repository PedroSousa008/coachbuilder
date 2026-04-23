"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function PresidentFlowPlaceholder({
  title,
  description,
  bullets,
}: {
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-zinc-500">{description}</p>
      </div>
      <Card className="border-surface-border bg-surface-raised/30">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base text-white">Em construção</CardTitle>
          <Badge variant="muted">Próxima entrega</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium text-zinc-300">O que vem a seguir nesta área:</p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-zinc-400">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

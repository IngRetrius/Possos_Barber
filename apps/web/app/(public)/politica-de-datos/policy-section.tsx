import type { ReactNode } from "react";

/** Una sección de la política: título y texto, con las listas con viñeta. */
export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-heading">{title}</h2>
      <div className="grid gap-2 text-body text-fg-muted [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

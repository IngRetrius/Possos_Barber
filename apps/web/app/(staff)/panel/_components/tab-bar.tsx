"use client";

import { CalendarDays, CalendarRange, Menu, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { TabBar } from "@possos/ui";

const TABS = [
  { href: "/panel", label: "Hoy", icon: <CalendarDays /> },
  { href: "/panel/semana", label: "Semana", icon: <CalendarRange /> },
  { href: "/panel/clientes", label: "Clientes", icon: <Users /> },
  { href: "/panel/mas", label: "Más", icon: <Menu /> },
];

/**
 * Las cuatro pestañas del panel (docs/11). Solo en las pantallas principales: las de una tarea
 * (nueva cita, editar un servicio) tienen su propia barra con la acción y un botón atrás.
 */
export function PanelTabBar() {
  const pathname = usePathname();
  const current = TABS.find((t) => t.href === pathname);
  if (!current) return null;
  return (
    <TabBar label="Panel" items={TABS.map((t) => ({ ...t, current: t.href === current.href }))} />
  );
}

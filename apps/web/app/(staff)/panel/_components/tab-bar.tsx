"use client";

import { CalendarDays, CalendarRange, Menu, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { TabBar } from "@possos/ui";

const TABS = [
  { href: "/panel", key: "today", icon: <CalendarDays /> },
  { href: "/panel/semana", key: "week", icon: <CalendarRange /> },
  { href: "/panel/clientes", key: "customers", icon: <Users /> },
  { href: "/panel/mas", key: "more", icon: <Menu /> },
] as const;

/**
 * Las cuatro pestañas del panel (docs/11). Solo en las pantallas principales: las de una tarea
 * (nueva cita, editar un servicio) tienen su propia barra con la acción y un botón atrás.
 */
export function PanelTabBar() {
  const t = useTranslations("web.panel.tabs");
  const pathname = usePathname();
  const current = TABS.find((t) => t.href === pathname);
  if (!current) return null;
  return (
    <TabBar
      label={t("label")}
      items={TABS.map((tab) => ({
        href: tab.href,
        icon: tab.icon,
        label: t(tab.key),
        current: tab.href === current.href,
      }))}
    />
  );
}

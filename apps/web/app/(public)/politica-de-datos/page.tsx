import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { parseLocale } from "@possos/config/constants";
import { DATA_POLICY_VERSION } from "@possos/customers";
import { SiteHeader } from "../../_components/site-header";
import { PolicyEn } from "./policy-en";
import { PolicyEs } from "./policy-es";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("web.policy");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/**
 * Política de tratamiento de datos (Ley 1581 de 2012). Versionada: quien completa su perfil
 * acepta DATA_POLICY_VERSION, que se guarda en customers.data_policy_version. El texto que rige
 * es el español (`policy-es`); el inglés es una traducción. Faltan los datos del responsable
 * ([PENDIENTE] del dueño) y la revisión de un abogado (riesgo 8 de docs/10).
 */
export default async function DataPolicyPage() {
  const t = await getTranslations("web.policy");
  const locale = parseLocale(await getLocale());
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="grid max-w-prose gap-6 px-gutter pt-2 pb-12">
        <div className="grid gap-2">
          <h1 className="text-title">{t("title")}</h1>
          <p className="text-caption text-fg-muted">
            {t("version", { version: DATA_POLICY_VERSION })}
          </p>
        </div>
        {locale === "en" ? <PolicyEn /> : <PolicyEs />}
      </main>
    </div>
  );
}

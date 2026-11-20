import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getBarber,
  listBarberServiceIds,
  listPortfolio,
  publicImageUrl,
} from "@possos/barbers/server";
import { BarberForm, ImageUpload } from "@possos/barbers/ui";
import { listActiveServices } from "@possos/catalog/server";
import { loadAdminPanel } from "../../../../../lib/panel";
import { addPortfolioAction, setPhotoAction, updateBarberAction } from "../../_actions/admin";
import { PanelHeader } from "../../_components/panel-header";
import { RemoveWorkButton } from "../../_components/remove-work-button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.admin.meta"))("barber") };
}

/** Perfil de un barbero (administrador): foto, portafolio, datos, servicios y si está activo. */
export default async function EditBarberPage({ params }: PageProps<"/panel/barberos/[id]">) {
  const { id } = await params;
  const { db } = await loadAdminPanel(`/panel/barberos/${id}`);
  const [barber, serviceIds, services, portfolio] = await Promise.all([
    getBarber(db, id),
    listBarberServiceIds(db, id),
    listActiveServices(db),
    listPortfolio(db, [id]),
  ]);
  if (!barber.ok || !barber.data) notFound();
  const b = barber.data;
  const offered = serviceIds.ok ? serviceIds.data : [];
  const photo = b.photo_path ? publicImageUrl(db, "barber-photos", b.photo_path) : null;
  const works = portfolio.ok ? portfolio.data : [];
  const t = await getTranslations("web.staff.admin.barbers");

  return (
    <>
      <PanelHeader title={b.display_name} backHref="/panel/barberos" />
      <BarberForm
        action={updateBarberAction}
        initial={b}
        services={(services.ok ? services.data : []).map((s) => ({
          id: s.id,
          name: s.name,
          checked: offered.includes(s.id),
        }))}
      >
        <section className="grid gap-3" aria-labelledby="foto">
          <h2 id="foto" className="text-heading">
            {t("photo")}
          </h2>
          <div className="flex items-center gap-4">
            {photo ? (
              <Image
                src={photo}
                alt={t("photoAlt", { name: b.display_name })}
                width={80}
                height={80}
                sizes="80px"
                className="size-20 shrink-0 rounded-pill border border-border object-cover"
              />
            ) : (
              <span className="flex size-20 shrink-0 items-center justify-center rounded-pill border border-border text-caption text-fg-muted">
                {t("noPhoto")}
              </span>
            )}
            <ImageUpload
              barberId={b.id}
              bucket="barber-photos"
              onUploaded={setPhotoAction.bind(null, b.id)}
              label={photo ? t("changePhoto") : t("uploadPhoto")}
              className="flex-1"
            />
          </div>
        </section>
        <section className="grid gap-3" aria-labelledby="portafolio">
          <h2 id="portafolio" className="text-heading">
            {t("portfolio")}
          </h2>
          <p className="text-body text-fg-muted">{t("portfolioIntro")}</p>
          {works.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2">
              {works.map((w) => (
                <li key={w.id} className="grid gap-1">
                  <Image
                    src={publicImageUrl(db, "portfolio", w.image_path)}
                    alt={w.caption ?? t("workAlt", { name: b.display_name })}
                    width={120}
                    height={160}
                    sizes="120px"
                    // El mismo recorte 3:4 de la página pública, para ver cómo queda cada foto.
                    className="aspect-[3/4] w-full rounded-card border border-border object-cover"
                  />
                  <RemoveWorkButton id={w.id} />
                </li>
              ))}
            </ul>
          ) : null}
          <ImageUpload
            barberId={b.id}
            bucket="portfolio"
            onUploaded={addPortfolioAction.bind(null, b.id)}
            label={t("addPhoto")}
          />
        </section>
      </BarberForm>
    </>
  );
}

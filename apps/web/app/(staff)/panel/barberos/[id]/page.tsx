import type { Metadata } from "next";
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

export const metadata: Metadata = { title: "Barbero · Panel · Possos Barber" };

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
            Foto
          </h2>
          <div className="flex items-center gap-4">
            {photo ? (
              <Image
                src={photo}
                alt={`Foto de ${b.display_name}`}
                width={80}
                height={80}
                sizes="80px"
                className="size-20 shrink-0 rounded-pill border border-border object-cover"
              />
            ) : (
              <span className="flex size-20 shrink-0 items-center justify-center rounded-pill border border-border text-caption text-fg-muted">
                Sin foto
              </span>
            )}
            <ImageUpload
              barberId={b.id}
              bucket="barber-photos"
              onUploaded={setPhotoAction.bind(null, b.id)}
              label={photo ? "Cambiar la foto" : "Subir una foto"}
              className="flex-1"
            />
          </div>
        </section>
        <section className="grid gap-3" aria-labelledby="portafolio">
          <h2 id="portafolio" className="text-heading">
            Portafolio
          </h2>
          <p className="text-body text-fg-muted">
            Fotos de cortes para la página pública. Se guardan apenas las subes.
          </p>
          {works.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2">
              {works.map((w) => (
                <li key={w.id} className="grid gap-1">
                  <Image
                    src={publicImageUrl(db, "portfolio", w.image_path)}
                    alt={w.caption ?? `Trabajo de ${b.display_name}`}
                    width={120}
                    height={120}
                    sizes="120px"
                    className="aspect-square w-full rounded-card border border-border object-cover"
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
            label="Agregar una foto"
          />
        </section>
      </BarberForm>
    </>
  );
}

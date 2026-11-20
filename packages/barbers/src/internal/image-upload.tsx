"use client";

import { ImagePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { createClient } from "@possos/supabase/client";
import { cn, InlineError } from "@possos/ui";
import { IMAGE_ACCEPT, IMAGE_MAX_SIDE, newImagePath, type ImageBucket } from "./images";

export interface ImageUploadProps {
  barberId: string;
  bucket: ImageBucket;
  /** Server Action que guarda la ruta (foto del barbero o trabajo del portafolio). */
  onUploaded: (path: string) => Promise<{ ok: boolean; error?: string }>;
  label: string;
  className?: string;
}

/**
 * Reduce la foto en el navegador (lado mayor de 1600 px, JPEG) para que suba rápido desde el
 * celular, y la sube a `<bucket>/<barber_id>/`. Las políticas de Storage dejan escribir ahí solo
 * al barbero dueño y al administrador.
 */
async function toJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))),
      "image/jpeg",
      0.85,
    ),
  );
}

export function ImageUpload({ barberId, bucket, onUploaded, label, className }: ImageUploadProps) {
  const t = useTranslations("barbers.upload");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    setStatus("working");
    try {
      let blob: Blob;
      try {
        blob = await toJpeg(file);
      } catch {
        setError(t("unreadable"));
        return;
      }
      const path = newImagePath(barberId, crypto.randomUUID());
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (uploadError) {
        setError(t("failed"));
        return;
      }
      const saved = await onUploaded(path);
      if (!saved.ok) {
        await supabase.storage.from(bucket).remove([path]);
        setError(saved.error ?? t("notSaved"));
      }
    } finally {
      setStatus("idle");
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <label
        htmlFor={id}
        aria-busy={status === "working"}
        className={cn(
          "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-card border border-border-strong text-label transition-colors hover:bg-surface-2",
          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
          status === "working" && "pointer-events-none opacity-50",
        )}
      >
        <ImagePlus aria-hidden="true" strokeWidth={1.5} className="size-5" />
        {status === "working" ? t("working") : label}
        <input
          ref={input}
          id={id}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          disabled={status === "working"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </label>
      {error ? <InlineError>{error}</InlineError> : null}
    </div>
  );
}

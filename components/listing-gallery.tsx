"use client";
import { useTranslations } from "@/components/locale-provider";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
type Photo = {
  id: string;
  imageUrl: string;
  altText: string;
  isPrimary: boolean;
};
export function ListingGallery({
  images,
  title,
}: {
  images: Photo[];
  title: string;
}) {
  const { tr } = useTranslations();
  const photos = [...images].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
  );
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<number | null>(null);
  const active = photos[selected];
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, [open]);
  function move(direction: number) {
    setSelected(
      (current) => (current + direction + photos.length) % photos.length,
    );
  }
  if (!active)
    return (
      <div className="property-gallery-empty">
        <Building2 size={36} />
        <span>{tr("Fotoğraf eklenmemiş")}</span>
      </div>
    );
  return (
    <section className="property-gallery" aria-label={tr("İlan fotoğrafları")}>
      <button
        className="property-photo"
        type="button"
        onClick={() => setOpen(true)}
        aria-label={tr("{count}. fotoğrafı büyüt", { count: selected + 1 })}
      >
        <Image
          src={active.imageUrl}
          alt={active.altText || title}
          fill
          sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 900px) calc(100vw - 64px), 820px"
          preload={selected === 0}
        />
        <span className="photo-expand">
          <Expand size={18} /> {tr("Büyüt")}{" "}
        </span>
        <span className="photo-counter">
          {selected + 1} / {photos.length}
        </span>
      </button>
      <div className="photo-thumbnails" aria-label={tr("Tüm fotoğraflar")}>
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            className="photo-thumbnail"
            aria-label={tr("{count}. fotoğrafı göster", { count: index + 1 })}
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            <Image
              src={photo.imageUrl}
              alt={photo.altText || `${title} — ${index + 1}`}
              fill
              sizes="88px"
            />
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="photo-dialog"
        aria-label={tr("{title} fotoğraf galerisi", { title })}
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            move(-1);
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            move(1);
          }
        }}
      >
        <div className="photo-dialog-content">
          <div className="photo-dialog-header">
            <span aria-live="polite">
              {tr("Fotoğraf")} {selected + 1} / {photos.length}
            </span>
            <button
              type="button"
              className="photo-control"
              aria-label={tr("Galeriyi kapat")}
              onClick={() => setOpen(false)}
            >
              <X />
            </button>
          </div>
          <div
            className="photo-dialog-stage"
            onTouchStart={(e) => {
              touchStart.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStart.current !== null) {
                const distance =
                  e.changedTouches[0].clientX - touchStart.current;
                if (Math.abs(distance) > 50) move(distance > 0 ? -1 : 1);
              }
              touchStart.current = null;
            }}
          >
            <Image
              src={active.imageUrl}
              alt={active.altText || title}
              fill
              sizes="100vw"
            />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="photo-control photo-previous"
                  aria-label={tr("Önceki fotoğraf")}
                  onClick={() => move(-1)}
                >
                  <ChevronLeft />
                </button>
                <button
                  type="button"
                  className="photo-control photo-next"
                  aria-label={tr("Sonraki fotoğraf")}
                  onClick={() => move(1)}
                >
                  <ChevronRight />
                </button>
              </>
            )}
          </div>
          <div className="photo-thumbnails photo-dialog-thumbnails">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                className="photo-thumbnail"
                aria-label={tr("{count}. fotoğrafı aç", { count: index + 1 })}
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
              >
                <Image src={photo.imageUrl} alt="" fill sizes="88px" />
              </button>
            ))}
          </div>
        </div>
      </dialog>
    </section>
  );
}

"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { SignedMedia } from "@/modules/projects/media";

export function ProjectGallery({ images }: { images: SignedMedia[] }) {
  const [selected, setSelected] = useState<SignedMedia | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  if (!images.length) return null;
  return (
    <section className="gallery-section">
      <h2>Screenshots</h2>
      <div className="project-gallery">
        {images.map((image) => (
          <figure key={image.id}>
            <button
              type="button"
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setSelected(image);
              }}
              aria-label={`Enlarge: ${image.alt_text}`}
            >
              <Image
                src={image.url}
                alt={image.alt_text}
                width={image.width}
                height={image.height}
                unoptimized
              />
            </button>
            <figcaption>
              {image.alt_text}
              {image.is_cover && " · Cover"}
            </figcaption>
          </figure>
        ))}
      </div>
      <Dialog.Root
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-overlay" />
          <Dialog.Content
            className="image-dialog"
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              trigger.current?.focus();
            }}
          >
            <Dialog.Title className="sr-only">{selected?.alt_text}</Dialog.Title>
            {selected && (
              <Image
                src={selected.url}
                alt={selected.alt_text}
                width={selected.width}
                height={selected.height}
                unoptimized
              />
            )}
            <Dialog.Close asChild>
              <button className="icon-button drawer-close" aria-label="Close screenshot">
                <X size={22} />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

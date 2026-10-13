"use client";
import Image from "next/image";

export function ProjectCoverImage({
  src,
  alt,
  width,
  height,
  eager,
  compact,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  eager: boolean;
  compact: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      loader={({ src, width }) => `${src}?w=${width}`}
      sizes={
        compact
          ? "(max-width: 767px) 110px, 180px"
          : "(max-width: 767px) calc(100vw - 42px), (max-width: 1023px) calc((100vw - 80px) / 2), (max-width: 1279px) calc((100vw - 550px) / 2), 360px"
      }
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
    />
  );
}

"use client";
import Image from "next/image";
import { useState } from "react";
export function Avatar({
  id,
  name,
  hasAvatar = false,
  version,
  className = "",
}: {
  id: string;
  name: string;
  hasAvatar?: boolean;
  version?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`avatar ${className}`} aria-hidden="true">
      {name.slice(0, 1).toUpperCase() || "M"}
      {hasAvatar && !failed && (
        <Image
          key={version}
          src={`/api/profiles/${id}/avatar${version ? `?v=${encodeURIComponent(version)}` : ""}`}
          width={512}
          height={512}
          alt=""
          unoptimized
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

// Keep the lightweight viewport prefetch, then load the complete destination
// when someone indicates interest. Avoid fetching every project in a long feed.
export default function IntentLink({
  onMouseEnter,
  onFocus,
  onTouchStart,
  prefetch,
  ...props
}: ComponentProps<typeof Link>) {
  const [interested, setInterested] = useState(false);
  return (
    <Link
      {...props}
      prefetch={prefetch ?? (interested ? true : null)}
      onMouseEnter={(event) => {
        setInterested(true);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        setInterested(true);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        setInterested(true);
        onTouchStart?.(event);
      }}
    />
  );
}

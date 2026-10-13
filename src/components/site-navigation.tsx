"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteNavigation() {
  const pathname = usePathname();
  return (
    <nav className="site-navigation" aria-label="Site navigation">
      {[
        { href: "/explore", label: "Explore" },
        { href: "/makers", label: "Makers" },
        { href: "/about", label: "About us" },
      ].map(({ href, label }) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

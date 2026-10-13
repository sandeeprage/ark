import Link from "next/link";
import { ArrowUpRight, Layers3 } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-content">
        <div className="site-footer-about">
          <Link href="/" className="site-footer-brand" aria-label="ARK home">
            <Layers3 size={26} strokeWidth={1.6} aria-hidden="true" />
            <span>
              ARK<span className="site-footer-dot">.</span>
            </span>
          </Link>
          <p>A home for the projects you shipped and the people who made them.</p>
        </div>
        <nav className="site-footer-nav" aria-label="Footer navigation">
          <div>
            <span className="site-footer-heading">EXPLORE</span>
            <Link href="/explore">Discover projects</Link>
            <Link href="/search">Search</Link>
          </div>
          <div>
            <span className="site-footer-heading">MAKE</span>
            <Link href="/publish">Share your work <ArrowUpRight size={14} aria-hidden="true" /></Link>
            <Link href="/following">Following</Link>
          </div>
        </nav>
      </div>
      <div className="site-footer-bottom">
        <span>ARK — built for people who build.</span>
        <span>Built. Shipped. Shared.</span>
      </div>
    </footer>
  );
}

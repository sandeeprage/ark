import Link from "next/link";
import { Layers3 } from "lucide-react";

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
          <p>A home for shipped work.</p>
        </div>
        <nav className="site-footer-nav" aria-label="Footer navigation">
          <Link href="/explore">Discover projects</Link>
          <Link href="/makers">Makers</Link>
          <Link href="/about">About us</Link>
          <Link href="/publish">Share your work</Link>
        </nav>
      </div>
      <div className="site-footer-bottom">
        <span>© ARK. Built for people who build.</span>
        <nav className="legal-links" aria-label="Support and policies">
          <Link href="/help">Help</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/status">Service info</Link>
        </nav>
      </div>
    </footer>
  );
}

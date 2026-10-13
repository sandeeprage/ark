import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Compass, Layers3, Send, Users } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: { absolute: "ARK — A home for shipped work" },
  description:
    "Discover completed projects, meet the developers behind them, and give your own work a place to be found.",
};

export default function Home() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="landing-page">
        <header className="landing-header">
          <Link href="/" className="landing-brand" aria-label="ARK home">
            <Layers3 size={27} strokeWidth={1.7} aria-hidden="true" />
            <span>
              ARK<span className="landing-brand-dot">.</span>
            </span>
          </Link>
          <nav className="landing-nav" aria-label="Landing navigation">
            <Link href="/explore">Explore</Link>
            <Link href="/search">Search</Link>
            <Link href="/login">Sign in</Link>
          </nav>
          <Link href="/publish" className="landing-header-action">
            Share your work <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </header>

        <main id="main-content" className="landing-content" tabIndex={-1}>
          <section className="landing-hero" aria-labelledby="landing-title">
            <div className="landing-copy">
              <p className="landing-kicker">
                <span className="landing-kicker-line" /> THE DEVELOPER LAUNCHPAD
              </p>
              <h1 id="landing-title">
                Good work deserves to be discovered<span>.</span>
              </h1>
              <p className="landing-intro">
                A home for the projects you actually shipped. Put your work in front of curious
                people, find what others are building, and meet the makers behind it.
              </p>
              <div className="landing-actions">
                <Link href="/explore" className="landing-action-primary">
                  Explore projects <ArrowUpRight size={19} aria-hidden="true" />
                </Link>
                <Link href="/publish" className="landing-action-secondary">
                  Share your project <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
              <p className="landing-footnote">
                Built. Shipped. Shared. The work speaks for itself.
              </p>
            </div>

            <div className="landing-art" aria-hidden="true">
              <div className="landing-art-topline">
                <span>THE WORK / 001</span>
                <span>ARK — DISCOVER</span>
              </div>
              <div className="landing-art-orbit landing-art-orbit-one" />
              <div className="landing-art-orbit landing-art-orbit-two" />
              <div className="landing-art-center">
                <Layers3 size={68} strokeWidth={1} />
              </div>
              <div className="landing-art-label landing-art-label-left">IDEA → LIVE</div>
              <div className="landing-art-label landing-art-label-right">MADE TO BE FOUND ↗</div>
              <div className="landing-art-bottomline">
                <span>NO HYPE REQUIRED</span>
                <span>JUST THE WORK.</span>
              </div>
            </div>
          </section>

          <section className="landing-how" aria-labelledby="landing-how-title">
            <div className="landing-section-heading">
              <div>
                <p className="landing-section-kicker">A PLACE FOR THE WORK</p>
                <h2 id="landing-how-title">From shipped to seen.</h2>
              </div>
              <p>Everything starts with putting something real out into the world.</p>
            </div>
            <div className="landing-steps">
              <article>
                <div className="landing-step-top">
                  <span>01</span>
                  <Send size={21} aria-hidden="true" />
                </div>
                <h3>Share what you made</h3>
                <p>Give your completed project a home, with a link people can actually visit.</p>
              </article>
              <article>
                <div className="landing-step-top">
                  <span>02</span>
                  <Compass size={21} aria-hidden="true" />
                </div>
                <h3>Discover what is next</h3>
                <p>Browse launches across the community and find work worth exploring.</p>
              </article>
              <article>
                <div className="landing-step-top">
                  <span>03</span>
                  <Users size={21} aria-hidden="true" />
                </div>
                <h3>Meet the makers</h3>
                <p>Follow the people behind the projects and keep up with what they ship.</p>
              </article>
            </div>
          </section>

        </main>
        <SiteFooter />
      </div>
    </>
  );
}

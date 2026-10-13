import Link from "next/link";
import { ArrowUpRight, Compass, Layers3, Users } from "lucide-react";

export const metadata = { title: "About us" };

export default function About() {
  return (
    <div className="page about-page">
      <p className="eyebrow">ABOUT ARK</p>
      <h1>
        A home for work
        <br />
        worth discovering.
      </h1>
      <p className="about-intro">
        Good projects deserve more than a forgotten link. ARK gives completed work a place to be
        seen, tried, and shared with people who care about making things.
      </p>
      <div className="about-principles">
        <article>
          <Layers3 size={24} strokeWidth={1.5} />
          <h2>The work comes first.</h2>
          <p>
            Share a project people can use, with screenshots, a clear description, and a link to try
            it.
          </p>
        </article>
        <article>
          <Compass size={24} strokeWidth={1.5} />
          <h2>Discovery without the noise.</h2>
          <p>
            Browse by category and technology, find recent launches, and save the projects you want
            to revisit.
          </p>
        </article>
        <article>
          <Users size={24} strokeWidth={1.5} />
          <h2>People behind every project.</h2>
          <p>
            Meet the makers, explore their work, and follow the people whose next project you want
            to see.
          </p>
        </article>
      </div>
      <section className="about-invitation">
        <div>
          <p className="eyebrow">BUILT. SHIPPED. SHARED.</p>
          <h2>Made something? Give it a home.</h2>
        </div>
        <Link href="/publish" className="button button-primary">
          Share your work <ArrowUpRight size={16} />
        </Link>
      </section>
    </div>
  );
}

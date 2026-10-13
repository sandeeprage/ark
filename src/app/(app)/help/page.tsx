import Link from "next/link";
import { InformationPage } from "@/components/information-page";
export const metadata = { title: "Help" };
export default function Help() {
  return (
    <InformationPage
      title="Help with ARK"
      description="Get started, share your work, and manage your account."
    >
      <nav className="help-topics" aria-label="Help topics">
        <a href="#account">Account</a>
        <a href="#publishing">Publishing</a>
        <a href="#discovering">Discovery</a>
        <a href="#privacy">Privacy and safety</a>
      </nav>
      <section id="account">
        <h2>Sign in and set up your profile</h2>
        <p>
          Choose GitHub or Google on the sign-in page. The same buttons work for new and returning
          users. Complete approval in the browser where you started, then choose your public ARK
          username.
        </p>
        <p>
          If sign-in fails, return to the canonical site, https://ark-rage.vercel.app, and try
          again. Cancelling approval keeps your destination available for a retry. Settings is
          available through Edit profile on your own maker page.
        </p>
        <Link className="text-link" href="/settings">
          Account settings →
        </Link>
      </section>
      <section id="publishing">
        <h2>Publish a completed project</h2>
        <p>
          Add a name, tagline, description, category, and technologies. Include a working HTTPS
          website or public software destination. Add 1–8 PNG, JPEG, or WebP screenshots, no larger
          than 5 MiB and 4096 × 4096 pixels each, and describe each screenshot for people using
          assistive technology.
        </p>
        <p>
          Choose a cover and confirm the project is publicly available. You can edit, pin, or delete
          your own projects from their detail pages. If an upload fails, your input is kept: check
          the message and retry or replace the affected screenshot. Draft text stays in this browser
          tab; after a reload, new screenshots need to be selected again.
        </p>
        <Link className="text-link" href="/publish">
          Share your project →
        </Link>
      </section>
      <section id="discovering">
        <h2>Find and collect projects</h2>
        <p>
          Popular sorts by total upvotes; Latest shows recent launches. Search by project or maker
          name and narrow projects by category or technology. Remove an individual filter or use
          Clear filters to broaden results.
        </p>
        <p>
          You can follow other makers and remove your upvotes. You cannot upvote your own projects.
          Save is available on project detail pages. Every collection, including Saved, is public.
        </p>
        <Link className="text-link" href="/explore">
          Explore projects →
        </Link>
      </section>
      <section id="privacy">
        <h2>Privacy and safety</h2>
        <p>
          Your profile, projects, collections, and following lists are public. Your account
          settings, sign-in identities, notification inbox, and individual voter records are
          private. Only share screenshots and links you have permission to publish.
        </p>
        <p>
          Use Report on a project or maker page for spam, harassment, unsafe links, or rights
          concerns. For account help or an urgent concern, email support.
        </p>
        <Link className="text-link" href="/privacy">
          Read the privacy notice →
        </Link>
      </section>
    </InformationPage>
  );
}

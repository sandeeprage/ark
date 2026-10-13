import Link from "next/link";

export function InformationPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page narrow-page information-page">
      <p className="eyebrow">ARK</p>
      <h1>{title}</h1>
      <p className="page-description">{description}</p>
      <p className="form-note">Last updated 13 October 2026</p>
      {children}
      <section>
        <h2>Need help?</h2>
        <p>
          Contact{" "}
          <a className="text-link" href="mailto:arkragesupport@gmail.com">
            arkragesupport@gmail.com
          </a>
          . Include the page and what happened. Never send passwords, verification codes, or API
          keys.
        </p>
        <Link className="text-link" href="/help">
          ARK help →
        </Link>
      </section>
    </div>
  );
}

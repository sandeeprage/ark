import { InformationPage } from "@/components/information-page";
export const metadata = { title: "Terms" };
export default function Terms() {
  return (
    <InformationPage
      title="Using ARK"
      description="The rules for sharing work and participating in the ARK community."
    >
      <section>
        <h2>Share work you have the right to publish</h2>
        <p>
          Publish completed, publicly available projects with accurate descriptions, working
          destinations, and media you are allowed to share. You retain ownership of your work. By
          publishing it, you permit ARK to store and display the submitted content as part of the
          service until you remove it, subject to the cleanup process.
        </p>
      </section>
      <section>
        <h2>Respect other makers</h2>
        <p>
          Do not post malware, deceptive links, harassment, unlawful material, private information
          without permission, or content that infringes someone else’s rights. Do not manipulate
          votes, impersonate another maker, automate abusive activity, or try to bypass access
          controls.
        </p>
      </section>
      <section>
        <h2>Public portfolios and collections</h2>
        <p>
          Profiles, projects, collections, and following lists are public. You are responsible for
          checking what you publish. Manage account connections and preferences through Settings.
          Keep access to at least one usable sign-in provider when disconnecting an identity.
        </p>
      </section>
      <section>
        <h2>Verification and external links</h2>
        <p>
          Repository verification describes an authenticated ownership check at the date shown. It
          is not an endorsement of quality, originality, security, or authorship. External projects
          operate independently of ARK. Consider their permissions and policies before using them.
        </p>
      </section>
      <section>
        <h2>Moderation and account removal</h2>
        <p>
          ARK can review reports, hide content, and restrict accounts that violate these rules.
          Administrative decisions are recorded. Contact support if you believe a decision is
          mistaken. You can delete your own content or request account deletion through Settings;
          completed account erasure cannot be reversed.
        </p>
      </section>
      <section>
        <h2>Service changes</h2>
        <p>
          ARK is in development. Features and availability can change, and interruptions can occur.
          These rules may be updated as the service evolves; the date above records the latest
          version.
        </p>
      </section>
    </InformationPage>
  );
}

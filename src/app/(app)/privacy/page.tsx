import { InformationPage } from "@/components/information-page";
export const metadata = { title: "Privacy" };
export default function Privacy() {
  return (
    <InformationPage
      title="Privacy on ARK"
      description="What ARK stores, what others can see, and how you can manage your information."
    >
      <section>
        <h2>Account information</h2>
        <p>
          ARK uses Supabase Auth with GitHub and Google to sign you in. Providers supply identity
          information such as a verified account identifier, email address, and available profile
          details. ARK does not collect your provider password. Authentication cookies keep you
          signed in; the publishing form may store draft text in this browser tab.
        </p>
      </section>
      <section>
        <h2>Public information</h2>
        <p>
          Your chosen username, display name, bio, avatar, projects, screenshots, collection
          memberships, and following lists form your public portfolio. A connected GitHub profile
          may be shown publicly. Public information can be viewed without an ARK account and may be
          indexed or copied by others. Do not publish private information or screenshots containing
          secrets.
        </p>
      </section>
      <section>
        <h2>Private information</h2>
        <p>
          Your email, linked sign-in identities, private preferences, notification inbox, raw voter
          identities, and submitted reports are not part of public discovery. Authorized
          administrators can review reports and moderation records. These records are scheduled for
          removal after 90 days; account erasure redacts associated free text and keeps only minimal
          decision references until cleanup. Service providers process authentication, hosting,
          database, and media requests to operate ARK.
        </p>
      </section>
      <section>
        <h2>Media and service providers</h2>
        <p>
          Uploaded screenshots and avatars are checked and re-encoded to remove embedded metadata.
          Supabase hosts authentication, database records, and stored media. Vercel hosts the web
          application. Links to external projects take you to independently operated sites with
          their own policies.
        </p>
        <p>
          ARK does not use behavioral analytics, advertising pixels, or session replay in this
          release. Operational error and security records support reliability and abuse prevention.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You can edit your public profile, remove projects or collection memberships, change
          notification preferences, and manage connected identities in Settings. Deleting your
          account hides its public content and queues removal of account records and associated
          media. It also removes your follows, votes, collections, and notifications. Copies
          previously made by other people or search engines are outside ARK’s control; provider
          backup retention may differ from live-data removal.
        </p>
        <p>
          Contact support about privacy, access, or removal questions. Do not include passwords or
          authentication codes in your message.
        </p>
      </section>
    </InformationPage>
  );
}
